import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { invoice_id } = await req.json()
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData } = await supabaseUser.auth.getUser()
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify the caller can actually see this invoice (RLS-scoped, no service role here yet)
    const { data: invoice, error: invoiceError } = await supabaseUser
      .from("invoices")
      .select("id, business_id, invoice_number, total, currency, status")
      .eq("id", invoice_id)
      .maybeSingle()

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (invoice.status === "paid") {
      return new Response(JSON.stringify({ error: "This invoice is already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice_id)

    const paidTotal = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    const balanceDue = Number(invoice.total) - paidTotal

    if (balanceDue <= 0) {
      return new Response(JSON.stringify({ error: "No balance remaining on this invoice" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, stripe_account_id, stripe_charges_enabled")
      .eq("id", invoice.business_id)
      .maybeSingle()

    if (!business?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "This business hasn't connected Stripe yet. Go to Business details to connect." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const origin = req.headers.get("origin") || "https://start.tractbook.com"

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: (invoice.currency || "USD").toLowerCase(),
              product_data: { name: `Invoice ${invoice.invoice_number}` },
              unit_amount: Math.round(balanceDue * 100),
            },
            quantity: 1,
          },
        ],
        metadata: { invoice_id: invoice.id },
        success_url: `${origin}/invoices/${invoice.id}?payment=success`,
        cancel_url: `${origin}/invoices/${invoice.id}?payment=cancelled`,
      },
      { stripeAccount: business.stripe_account_id }
    )

    await supabaseAdmin
      .from("invoices")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", invoice.id)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
