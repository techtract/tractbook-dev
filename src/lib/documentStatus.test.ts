import { describe, it, expect } from "vitest"
import { daysUntil, invoiceState, invoiceStatusInfo, estimateStatusInfo, invoiceBadge } from "./documentStatus"

const today = new Date(2026, 10, 4, 15, 30) // 4 Nov 2026, mid afternoon

describe("daysUntil", () => {
  it("counts calendar days", () => {
    expect(daysUntil("2026-11-04", today)).toBe(0)
    expect(daysUntil("2026-11-05", today)).toBe(1)
    expect(daysUntil("2026-11-03", today)).toBe(-1)
  })
  it("is not thrown off by a daylight saving change", () => {
    expect(daysUntil("2026-03-09", new Date(2026, 2, 7, 23, 59))).toBe(2)
  })
  it("returns null without a usable date", () => {
    expect(daysUntil(null, today)).toBeNull()
    expect(daysUntil("", today)).toBeNull()
  })
})

describe("invoiceState", () => {
  it("a sent invoice past its due date is overdue", () => {
    expect(invoiceState("sent", "2026-11-03", today)).toBe("overdue")
  })
  it("due today is NOT overdue yet", () => {
    expect(invoiceState("sent", "2026-11-04", today)).toBe("sent")
  })
  it("a draft is never overdue, even with a past due date", () => {
    expect(invoiceState("draft", "2026-01-01", today)).toBe("draft")
  })
  it("a paid invoice is never overdue", () => {
    expect(invoiceState("paid", "2026-01-01", today)).toBe("paid")
  })
  it("a void invoice is never overdue", () => {
    expect(invoiceState("void", "2026-01-01", today)).toBe("void")
  })
  it("a sent invoice with no due date is just sent", () => {
    expect(invoiceState("sent", null, today)).toBe("sent")
  })
})

describe("invoiceStatusInfo", () => {
  it("words the days correctly", () => {
    expect(invoiceStatusInfo("sent", "2026-11-03", today).text).toBe("Overdue 1 day")
    expect(invoiceStatusInfo("sent", "2026-10-25", today).text).toBe("Overdue 10 days")
    expect(invoiceStatusInfo("sent", "2026-11-04", today).text).toBe("Due today")
    expect(invoiceStatusInfo("sent", "2026-11-05", today).text).toBe("Due in 1 day")
    expect(invoiceStatusInfo("sent", "2026-11-10", today).text).toBe("Due in 6 days")
    expect(invoiceStatusInfo("sent", "2026-12-30", today).text).toBe("Sent")
  })
  it("a draft with a due date inside two weeks shows Draft, not Due in", () => {
    expect(invoiceStatusInfo("draft", "2026-11-10", today).text).toBe("Draft")
  })
  it("overdue is red", () => {
    expect(invoiceStatusInfo("sent", "2026-11-01", today).className).toBe("text-red-700")
  })
})

describe("invoiceBadge", () => {
  it("labels an overdue invoice overdue", () => {
    expect(invoiceBadge("sent", "2026-11-01", today).label).toBe("overdue")
  })
})

describe("estimateStatusInfo", () => {
  it("estimates expire, they are not overdue", () => {
    expect(estimateStatusInfo("sent", "2026-11-01", today).text).toBe("Expired 3 days ago")
    expect(estimateStatusInfo("sent", "2026-11-04", today).text).toBe("Expires today")
    expect(estimateStatusInfo("sent", "2026-11-09", today).text).toBe("Expires in 5 days")
  })
  it("a draft or converted estimate never shows an expiry", () => {
    expect(estimateStatusInfo("draft", "2026-01-01", today).text).toBe("Draft")
    expect(estimateStatusInfo("converted", "2026-01-01", today).text).toBe("Converted")
  })
})
