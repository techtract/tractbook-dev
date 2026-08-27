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

    const { data: membership } = await supabaseUser
      .from("business_members")
      .select("business_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return new Response(JSON.stringify({ error: "No active business found for this account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const businessId = membership.business_id

    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    console.log("SERVICE_ROLE_KEY present:", !!svcKey, "length:", svcKey?.length || 0)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // TEMP diagnostic: raw fetch to PostgREST, bypassing the JS SDK entirely
    const rawTest = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/businesses?id=eq.${businessId}&select=id,name`,
      {
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
      }
    )
    const rawTestBody = await rawTest.text()

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name, stripe_account_id, country")
      .eq("id", businessId)
      .maybeSingle()

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found", debug: {
          svcKeyPresent: !!svcKey,
          svcKeyLength: svcKey?.length || 0,
          svcKeyPreview: svcKey ? svcKey.slice(0, 10) : null,
          secretKeysRaw: Deno.env.get("SUPABASE_SECRET_KEYS") ? "present" : "absent",
          secretKeysShape: (() => {
            try {
              const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}")
              return Object.keys(parsed)
            } catch {
              return "not valid JSON"
            }
          })(),
          rawTestStatus: rawTest.status,
          rawTestBody,
          businessId,
        } }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let accountId = business.stripe_account_id

    if (!accountId) {
      const v2Res = await fetch("https://api.stripe.com/v2/core/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")!}`,
          "Content-Type": "application/json",
          "Stripe-Version": "2026-08-26.preview",
        },
        body: JSON.stringify({
          contact_email: userData.user.email || undefined,
          dashboard: "express",
          identity: {
            country: (business.country || "CA").toLowerCase(),
          },
          defaults: {
            responsibilities: {
              losses_collector: "stripe",
              fees_collector: "stripe",
            },
          },
          configuration: { merchant: {} },
        }),
      })

      const v2Body = await v2Res.json()

      if (!v2Res.ok) {
        return new Response(
          JSON.stringify({ error: "Stripe v2 account creation failed", stripeError: v2Body }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      accountId = v2Body.id

      await supabaseAdmin
        .from("businesses")
        .update({ stripe_account_id: accountId })
        .eq("id", businessId)
    }

    const origin = req.headers.get("origin") || "https://start.tractbook.com"

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/business?stripe_onboarding=refresh`,
      return_url: `${origin}/business?stripe_onboarding=complete`,
      type: "account_onboarding",
    })

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})








