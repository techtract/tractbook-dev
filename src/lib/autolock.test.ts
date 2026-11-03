import { describe, it, expect } from "vitest"
import { isExpired, LOCK_AFTER_MS } from "./autolock"

describe("isExpired", () => {
  it("is false when there is no record yet", () => {
    expect(isExpired(null, 1_000_000)).toBe(false)
  })
  it("is false before the limit", () => {
    expect(isExpired(1000, 1000 + LOCK_AFTER_MS - 1)).toBe(false)
  })
  it("is true at the limit", () => {
    expect(isExpired(1000, 1000 + LOCK_AFTER_MS)).toBe(true)
  })
  it("is false for a bad stored value", () => {
    expect(isExpired(NaN, 5)).toBe(false)
  })
  it("respects a custom limit", () => {
    expect(isExpired(0, 10, 10)).toBe(true)
  })
})
