import { supabase } from "./supabase"

// Asks the send-invite function to email an invite that was already saved.
export async function sendInviteEmail(inviteId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke("send-invite", { body: { invite_id: inviteId } })
    if (error) {
      console.error("send-invite failed", error)
      return { ok: false, error: "We couldn't send the email. Try Resend from your Account page." }
    }
    return { ok: true }
  } catch (err) {
    console.error("send-invite failed", err)
    return { ok: false, error: "We couldn't send the email. Try Resend from your Account page." }
  }
}
