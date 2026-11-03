import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")
  const rawBody = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature!,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )
  } catch (err) {
    console.log("Signature verification failed:", String(err))
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Idempotency: if we've already processed this exact event, stop here
  const { data: existing } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ received: true, note: "already processed" }), { status: 200 })
  }

  // Record the event only AFTER it has been handled successfully. If settlement fails we
  // return 500 without recording, so Stripe's retry is processed again instead of being
  // skipped as "already processed" (which would silently lose the payment).
  const recordEvent = async () => {
    const { error } = await supabaseAdmin.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      raw_payload: event,
    })
    // 23505 = unique violation: a concurrent delivery already recorded it, which is fine
    if (error && error.code !== "23505") {
      console.log("Could not record webhook event:", error.message)
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any
    const invoiceId = session.metadata?.invoice_id

    if (!invoiceId) {
      console.log("checkout.session.completed with no invoice_id in metadata:", session.id)
      await recordEvent()
      return new Response(JSON.stringify({ received: true, note: "no invoice_id" }), { status: 200 })
    }

    // Only settle when Stripe says the money has actually been collected
    if (session.payment_status !== "paid") {
      console.log("checkout.session.completed but not paid yet:", session.id, session.payment_status)
      await recordEvent()
      return new Response(JSON.stringify({ received: true, note: "not paid" }), { status: 200 })
    }

    const amount = (session.amount_total || 0) / 100
    const currency = (session.currency || "usd").toUpperCase()
    const paymentIntentId = session.payment_intent as string

    let grossAmount = amount
    let netAmount = amount
    let stripeFee = 0

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ["latest_charge.balance_transaction"] },
        { stripeAccount: event.account }
      )
      const charge = (paymentIntent as any).latest_charge
      const balanceTxn = charge?.balance_transaction
      if (balanceTxn) {
        grossAmount = balanceTxn.amount / 100
        stripeFee = balanceTxn.fee / 100
        netAmount = balanceTxn.net / 100
      }
    } catch (err) {
      console.log("Could not fetch balance transaction, using session amount as fallback:", String(err))
    }

    const { error: settleError } = await supabaseAdmin.rpc("settle_invoice_payment", {
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_currency: currency,
      p_stripe_payment_intent_id: paymentIntentId,
      p_stripe_checkout_session_id: session.id,
      p_gross_amount: grossAmount,
      p_net_amount: netAmount,
      p_stripe_fee: stripeFee,
    })

    if (settleError) {
      console.log("settle_invoice_payment failed:", settleError.message)
      return new Response(JSON.stringify({ error: settleError.message }), { status: 500 })
    }
  }

  await recordEvent()
  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
