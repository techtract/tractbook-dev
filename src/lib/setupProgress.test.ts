import { describe, it, expect } from "vitest"
import { getSetupProgress } from "./setupProgress"

describe("getSetupProgress", () => {
  it("starts at 20% (business created) with the customer step next", () => {
    const p = getSetupProgress({ customers: 0, documents: 0, receipts: 0, paymentsConnected: false })
    expect(p.percent).toBe(20)
    expect(p.next?.key).toBe("customer")
    expect(p.complete).toBe(false)
  })

  it("moves the next step forward as things get done", () => {
    const p = getSetupProgress({ customers: 2, documents: 1, receipts: 0, paymentsConnected: false })
    expect(p.percent).toBe(60)
    expect(p.next?.key).toBe("receipt")
  })

  it("is complete at 100% with no next step", () => {
    const p = getSetupProgress({ customers: 1, documents: 1, receipts: 1, paymentsConnected: true })
    expect(p.percent).toBe(100)
    expect(p.complete).toBe(true)
    expect(p.next).toBeNull()
  })
})
