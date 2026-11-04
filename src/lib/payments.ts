// Shared payment-amount rules for Receive payment (invoices) and Record payment (estimates).
// All maths is done in whole cents to avoid floating point surprises (0.1 + 0.2).

export const toCents = (n: number) => Math.round(n * 100)

export const money = (cents: number) => (cents / 100).toFixed(2)

/** Balance still owed, in cents, never below zero. */
export function balanceDueCents(total: number, paidAmounts: number[]): number {
  const paid = paidAmounts.reduce((sum, a) => sum + toCents(Number(a) || 0), 0)
  return Math.max(0, toCents(Number(total) || 0) - paid)
}

/**
 * Returns a message when the typed amount cannot be accepted, or null when it is fine.
 * balanceCents = null means the balance is not known yet (still loading).
 */
export function validatePaymentAmount(
  raw: string,
  balanceCents: number | null,
  noun: "invoice" | "estimate" = "invoice"
): string | null {
  const text = raw.trim()
  if (!text) return null // nothing typed yet: no message, the button stays disabled

  const value = Number(text)
  if (!Number.isFinite(value) || value <= 0) return "Enter an amount greater than zero."

  if (/\.\d{3,}/.test(text)) return "Use at most two decimal places."

  if (balanceCents === null) return null
  if (balanceCents <= 0) {
    return noun === "invoice"
      ? "This invoice is already fully paid."
      : "This estimate is already fully covered by payments."
  }
  if (toCents(value) > balanceCents) {
    return `The amount is more than the balance due ($${money(balanceCents)}).`
  }
  return null
}
