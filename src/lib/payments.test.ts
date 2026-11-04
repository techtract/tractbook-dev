import { describe, it, expect } from "vitest"
import { balanceDueCents, validatePaymentAmount } from "./payments"

describe("balanceDueCents", () => {
  it("subtracts payments from the total", () => {
    expect(balanceDueCents(500, [200, 50])).toBe(25000)
  })
  it("never goes below zero", () => {
    expect(balanceDueCents(500, [600])).toBe(0)
  })
  it("handles floating point sums", () => {
    expect(balanceDueCents(0.3, [0.1, 0.2])).toBe(0)
  })
})

describe("validatePaymentAmount", () => {
  it("says nothing before anything is typed", () => {
    expect(validatePaymentAmount("", 50000)).toBeNull()
  })
  it("blocks zero and negative amounts", () => {
    expect(validatePaymentAmount("0", 50000)).toMatch(/greater than zero/)
    expect(validatePaymentAmount("-50", 50000)).toMatch(/greater than zero/)
  })
  it("blocks more than two decimal places", () => {
    expect(validatePaymentAmount("10.123", 50000)).toMatch(/two decimal/)
  })
  it("blocks an amount above the balance and names the balance", () => {
    expect(validatePaymentAmount("600", 50000)).toBe("The amount is more than the balance due ($500.00).")
  })
  it("allows exactly the balance", () => {
    expect(validatePaymentAmount("500", 50000)).toBeNull()
  })
  it("blocks any payment on a fully paid invoice", () => {
    expect(validatePaymentAmount("1", 0)).toMatch(/already fully paid/)
  })
  it("does not block while the balance is still loading", () => {
    expect(validatePaymentAmount("100", null)).toBeNull()
  })
})
