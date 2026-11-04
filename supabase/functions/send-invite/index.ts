import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const FROM_ADDRESS = "Tractbook <noreply@mail.tractbook.com>"
const APP_BASE_URL = "https://start.tractbook.com"

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 })
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401 })
    }

    const { invite_id } = await req.json()
    if (!invite_id) {
      return new Response(JSON.stringify({ error: "invite_id is required" }), { status: 400 })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invites")
      .select("id, business_id, email, name, role, status, token, invited_by")
      .eq("id", invite_id)
      .maybeSingle()

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
    }

    if (invite.status !== "pending") {
      return new Response(JSON.stringify({ error: `Invite is already ${invite.status}` }), { status: 400 })
    }

    const { data: isOwner } = await supabaseAdmin.rpc("is_business_owner", {
      business_id_input: invite.business_id,
      user_id_input: userData.user.id,
    })

    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Only the business owner can send this invite" }), { status: 403 })
    }

    const acceptUrl = `${APP_BASE_URL}/accept-invite?token=${invite.token}`

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: invite.email,
        subject: "You've been invited to Tractbook",
        html: `
          <p>Hi ${invite.name || ""},</p>
          <p>You've been invited to join a Tractbook workspace as an <strong>${invite.role}</strong>.</p>
          <p><a href="${acceptUrl}">Click here to accept the invite and set up your account</a></p>
          <p>This link expires in 4 hours.</p>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const errText = await resendResponse.text()
      console.log("Resend send failed:", errText)
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errText }), { status: 502 })
    }

    const { error: updateError } = await supabaseAdmin
      .from("invites")
      .update({
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", invite.id)

    if (updateError) {
      console.log("Failed to update invite after send:", updateError.message)
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 })
  } catch (err) {
    console.log("send-invite error:", String(err))
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500 })
  }
})
