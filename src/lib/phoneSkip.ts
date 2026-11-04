// Who may skip the phone-verification step during the beta.
// Phone codes go through Twilio, which is on a trial that can only text numbers we verified ourselves,
// so outside testers could never finish sign-up. Switch SKIP_PHONE_FOR_GOOGLE to false to require the step again.

export const SKIP_PHONE_FOR_GOOGLE = true

const TEAM_TEST_EMAILS = ["rakeshchandra.chandra21@gmail.com", "kloroncanada@gmail.com"]

export function isTeamTestUser(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.toLowerCase()
  return normalized.endsWith("@nxtwave.ca") || TEAM_TEST_EMAILS.includes(normalized)
}

type UserLike = {
  app_metadata?: { provider?: string; providers?: string[] } | null
  identities?: { provider?: string }[] | null
} | null | undefined

export function signedInWithGoogle(user: UserLike): boolean {
  if (!user) return false
  if (user.app_metadata?.provider === "google") return true
  if (user.app_metadata?.providers?.includes("google")) return true
  return !!user.identities?.some((i) => i.provider === "google")
}

export function canSkipPhoneVerification(opts: { email?: string | null; user?: UserLike; isDev?: boolean }): boolean {
  if (opts.isDev) return true
  if (isTeamTestUser(opts.email)) return true
  return SKIP_PHONE_FOR_GOOGLE && signedInWithGoogle(opts.user)
}
