import { describe, it, expect } from "vitest"
import { isValidGstHst, normalizeGstHst, formatGstHst } from "./taxNumber"

describe("GST/HST registration number", () => {
  it("accepts the standard format", () => {
    expect(isValidGstHst("123456789RT0001")).toBe(true)
  })
  it("accepts spaces, dashes and lower case", () => {
    expect(isValidGstHst("123456789 rt 0001")).toBe(true)
    expect(isValidGstHst("123456789-RT-0001")).toBe(true)
  })
  it("rejects a bare business number and wrong shapes", () => {
    expect(isValidGstHst("123456789")).toBe(false)
    expect(isValidGstHst("12345678RT0001")).toBe(false)
    expect(isValidGstHst("123456789RC0001")).toBe(false)
    expect(isValidGstHst("123456789RT001")).toBe(false)
  })
  it("normalizes and formats", () => {
    expect(normalizeGstHst(" 123456789 rt 0001 ")).toBe("123456789RT0001")
    expect(formatGstHst("123456789RT0001")).toBe("123456789 RT 0001")
  })
})
