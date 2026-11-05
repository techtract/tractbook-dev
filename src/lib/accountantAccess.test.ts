import { describe, it, expect } from "vitest"
import { isBlockedForAccountant } from "./accountantAccess"

describe("accountant access", () => {
  it("blocks screens that create or change things", () => {
    for (const p of ["/invoices/new", "/estimates/new", "/customers/new", "/invoices/abc/edit", "/invoices/abc/send", "/estimates/abc/payment", "/invoices/abc/payment", "/business", "/ocr/scan", "/ocr/review"]) {
      expect(isBlockedForAccountant(p)).toBe(true)
    }
  })
  it("allows reading", () => {
    for (const p of ["/dashboard", "/invoices", "/invoices/abc", "/invoices/abc/print", "/estimates", "/estimates/abc", "/customers", "/customers/abc", "/ocr", "/ocr/abc", "/ocr/insights", "/account"]) {
      expect(isBlockedForAccountant(p)).toBe(false)
    }
  })
  it("ignores a trailing slash", () => {
    expect(isBlockedForAccountant("/invoices/new/")).toBe(true)
  })
})
