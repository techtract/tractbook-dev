import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const FROM_ADDRESS = "Tractbook <noreply@mail.tractbook.com>"
const APP_BASE_URL = "https://start.tractbook.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401)

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData?.user) return json({ error: "Invalid or expired session" }, 401)
    const user = userData.user

    const { type, id } = await req.json()
    if ((type !== "invoice" && type !== "estimate") || !id) {
      return json({ error: "type (invoice or estimate) and id are required" }, 400)
    }
    const isInvoice = type === "invoice"
    const table = isInvoice ? "invoices" : "estimates"
    const activityTable = isInvoice ? "invoice_activity" : "estimate_activity"
    const fkColumn = isInvoice ? "invoice_id" : "estimate_id"
    const numberColumn = isInvoice ? "invoice_number" : "estimate_number"

    // Row-level security means this only returns a document the signed-in user can access.
    const { data: doc, error: docError } = await supabaseUser
      .from(table)
      .select("*, customers(name, email)")
      .eq("id", id)
      .maybeSingle()
    if (docError || !doc) return json({ error: `${isInvoice ? "Invoice" : "Estimate"} not found` }, 404)

    if (doc.status === "void") return json({ error: "A void invoice cannot be sent." }, 400)

    const customer = Array.isArray(doc.customers) ? doc.customers[0] : doc.customers
    if (!customer?.email) return json({ error: "Add an email address to this customer first." }, 400)

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("name")
      .eq("id", doc.business_id)
      .maybeSingle()
    const businessName = business?.name || "Your supplier"

    const viewUrl = `${APP_BASE_URL}/view/${type}/${doc.share_token}`
    const label = isInvoice ? "invoice" : "estimate"
    const number = doc[numberColumn]
    const total = Number(doc.total).toFixed(2)
    const dueLine = isInvoice && doc.due_date
      ? `<p style="margin:0 0 4px">Payment due: <strong>${esc(doc.due_date)}</strong></p>`
      : !isInvoice && doc.due_date
        ? `<p style="margin:0 0 4px">Valid until: <strong>${esc(doc.due_date)}</strong></p>`
        : ""

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
        <p>Hi ${esc(customer.name || "")},</p>
        <p>${esc(businessName)} sent you an ${label}.</p>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 4px">${isInvoice ? "Invoice" : "Estimate"} <strong>${esc(number)}</strong></p>
          <p style="margin:0 0 4px">Total: <strong>$${total} ${esc(doc.currency || "")}</strong></p>
          ${dueLine}
        </div>
        <p><a href="${viewUrl}" style="display:inline-block;background:#0d44da;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">View ${label}</a></p>
        <p style="font-size:12px;color:#6b7280">You can print it or save it as a PDF from that page. Reply to this email to reach ${esc(businessName)}.</p>
        <p style="font-size:12px;color:#9ca3af">Sent with Tractbook</p>
      </div>`

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${businessName.replace(/[<>"]/g, "")} via Tractbook <noreply@mail.tractbook.com>`,
        to: customer.email,
        reply_to: user.email,
        subject: `${isInvoice ? "Invoice" : "Estimate"} ${number} from ${businessName}`,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const errText = await resendResponse.text()
      console.log("Resend send failed:", errText)
      let reason = ""
      try {
        reason = JSON.parse(errText)?.message || ""
      } catch (_) {
        reason = errText.slice(0, 200)
      }
      return json({ error: `The email could not be sent${reason ? `: ${reason}` : ". Please try again."}`, detail: errText }, 502)
    }

    // Only after the email really went out: mark as sent and log it.
    const update: Record<string, unknown> = { sent_at: new Date().toISOString() }
    if (doc.status === "draft") update.status = "sent"
    const { error: updError } = await supabaseAdmin.from(table).update(update).eq("id", id)
    if (updError) console.log("Failed to update status after send:", updError.message)

    await supabaseAdmin.from(activityTable).insert({
      [fkColumn]: id,
      user_name: user.email,
      action: "Sent",
      detail: `Emailed to ${customer.email}`,
    })

    return json({ sent: true, to: customer.email })
  } catch (err) {
    console.log("send-document error:", String(err))
    return json({ error: "Unexpected error" }, 500)
  }
})
