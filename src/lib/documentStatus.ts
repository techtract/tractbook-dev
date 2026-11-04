// One place that decides what status label an invoice or estimate shows, so the lists,
// the detail pages and the dashboard can never disagree.
// "Overdue" and "Expired" are worked out from the date. They are never stored in the database.

export type InvoiceState = "draft" | "sent" | "overdue" | "paid" | "void"

export type StatusInfo = { state: string; text: string; className: string }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Whole days from today until the date (negative = already past). Uses calendar days, so DST cannot skew it. */
export function daysUntil(dateStr: string | null, today: Date = new Date()): number | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return null
  const due = Date.UTC(y, m - 1, d)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - now) / 86400000)
}

export function invoiceState(status: string, dueDate: string | null, today: Date = new Date()): InvoiceState {
  if (status === "paid") return "paid"
  if (status === "void") return "void"
  if (status === "draft") return "draft"
  const days = daysUntil(dueDate, today)
  if (days !== null && days < 0) return "overdue"
  return "sent"
}

export function invoiceStatusInfo(status: string, dueDate: string | null, today: Date = new Date()): StatusInfo {
  const state = invoiceState(status, dueDate, today)
  if (state === "paid") return { state, text: "Paid", className: "text-brand-success-dark" }
  if (state === "void") return { state, text: "Void", className: "text-gray-500" }
  if (state === "draft") return { state, text: "Draft", className: "text-gray-500" }

  const days = daysUntil(dueDate, today)
  if (days === null) return { state, text: cap(status), className: "text-gray-500" }
  if (days < 0) return { state, text: `Overdue ${plural(-days, "day")}`, className: "text-red-700" }
  if (days === 0) return { state, text: "Due today", className: "text-amber-700" }
  if (days <= 14) return { state, text: `Due in ${plural(days, "day")}`, className: "text-amber-700" }
  return { state, text: "Sent", className: "text-gray-500" }
}

/** The small badge on the invoice page: a word and its colours. */
export function invoiceBadge(status: string, dueDate: string | null, today: Date = new Date()) {
  const state = invoiceState(status, dueDate, today)
  const colours: Record<InvoiceState, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-50 text-blue-700",
    overdue: "bg-red-50 text-red-700",
    paid: "bg-brand-success-soft text-brand-success-dark",
    void: "bg-gray-100 text-gray-500",
  }
  return { state, label: state, className: colours[state] }
}

/** Estimates are "valid until" a date, so they expire; they are never overdue. */
export function estimateStatusInfo(status: string, validUntil: string | null, today: Date = new Date()): StatusInfo {
  if (status === "accepted") return { state: "accepted", text: "Accepted", className: "text-brand-success-dark" }
  if (status === "converted") return { state: "converted", text: "Converted", className: "text-gray-500" }
  if (status === "draft") return { state: "draft", text: "Draft", className: "text-gray-500" }

  const days = daysUntil(validUntil, today)
  if (days === null) return { state: status, text: cap(status), className: "text-gray-500" }
  if (days < 0) return { state: "expired", text: `Expired ${plural(-days, "day")} ago`, className: "text-red-700" }
  if (days === 0) return { state: "expiring", text: "Expires today", className: "text-amber-700" }
  if (days <= 14) return { state: "expiring", text: `Expires in ${plural(days, "day")}`, className: "text-amber-700" }
  return { state: "sent", text: "Sent", className: "text-gray-500" }
}
