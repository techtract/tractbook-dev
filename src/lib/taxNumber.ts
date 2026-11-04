// GST/HST registration number: 9-digit Business Number + "RT" + 4-digit account (e.g. 123456789RT0001).

export function normalizeGstHst(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase()
}

export function isValidGstHst(value: string): boolean {
  return /^\d{9}RT\d{4}$/.test(normalizeGstHst(value))
}

/** Shown as 123456789 RT 0001 for easy reading on documents. */
export function formatGstHst(value: string): string {
  const n = normalizeGstHst(value)
  return isValidGstHst(n) ? `${n.slice(0, 9)} RT ${n.slice(11)}` : value.trim()
}
