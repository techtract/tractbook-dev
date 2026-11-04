import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Public (no login) read of ONE document by its random share token.
// Deploy with --no-verify-jwt. Returns only what the printable page needs.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type")
    const token = url.searchParams.get("token") || ""
    if ((type !== "invoice" && type !== "estimate") || !UUID.test(token)) {
      return json({ error: "Not found" }, 404)
    }
    const isInvoice = type === "invoice"
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: doc } = await admin
      .from(isInvoice ? "invoices" : "estimates")
      .select("*, customers(first_name, last_name, name, company_name, billing_address, email, phone)")
      .eq("share_token", token)
      .maybeSingle()

    // Drafts were never sent, so they are never public.
    if (!doc || doc.status === "draft") return json({ error: "Not found" }, 404)

    const { data: business } = await admin
      .from("businesses")
      .select("name, street1, city, region, country, phone, tax_registration_number")
      .eq("id", doc.business_id)
      .maybeSingle()

    const { data: items } = await admin
      .from(isInvoice ? "invoice_line_items" : "estimate_line_items")
      .select("item_name, description, quantity, unit_price, sort_order")
      .eq(isInvoice ? "invoice_id" : "estimate_id", doc.id)
      .order("sort_order")

    let paidTotal = 0
    if (isInvoice) {
      const { data: pays } = await admin.from("payments").select("amount").eq("invoice_id", doc.id)
      paidTotal = (pays || []).reduce((s, p) => s + Number(p.amount), 0)
    }

    const { customers, business_id: _b, created_by: _c, share_token: _t, ...document } = doc
    return json({ type, document, customer: customers, business, items: items || [], paidTotal })
  } catch (err) {
    console.log("public-document error:", String(err))
    return json({ error: "Unexpected error" }, 500)
  }
})
