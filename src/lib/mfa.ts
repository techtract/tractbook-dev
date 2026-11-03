import { supabase } from "./supabase"

// True when the signed-in user has two-step verification turned on but has not
// yet entered a code in this session.
export async function needsSecondStep(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return false
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2"
}
