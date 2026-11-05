// The invite link a person opened before they had an account, kept so we can finish
// accepting it after they sign up or sign in (even in another tab after confirming their email).
const KEY = "tractbook.pendingInvite"

export function getPendingInvite(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setPendingInvite(token: string) {
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    // storage blocked: the person can open the email link again after signing in
  }
}

export function clearPendingInvite() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
