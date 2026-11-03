// Auto-lock: after a period of no activity, ask for the password again.
// Settings live on this device only (localStorage), because a phone and a
// laptop can reasonably differ.

export const LOCK_AFTER_MS = 2 * 60 * 1000
export const MAX_PASSWORD_TRIES = 5

const ENABLED_KEY = "tb_autolock_enabled"
const ACTIVE_KEY = "tb_last_active"

export function isExpired(lastActive: number | null, now: number, limit = LOCK_AFTER_MS): boolean {
  if (lastActive === null || Number.isNaN(lastActive)) return false
  return now - lastActive >= limit
}

export function getAutoLockEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "off"
  } catch {
    return true
  }
}

export function setAutoLockEnabled(on: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "on" : "off")
  } catch {
    /* storage unavailable: keep default */
  }
}

export function readLastActive(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw === null ? null : Number(raw)
  } catch {
    return null
  }
}

export function writeLastActive(t: number): void {
  try {
    localStorage.setItem(ACTIVE_KEY, String(t))
  } catch {
    /* ignore */
  }
}

export function clearLastActive(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore */
  }
}
