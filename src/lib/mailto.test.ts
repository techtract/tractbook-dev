import { describe, it, expect } from "vitest"
import { buildMailto, diagnosticsText } from "./mailto"

describe("buildMailto", () => {
  it("encodes spaces as %20 and keeps the address", () => {
    const url = buildMailto("support@tractbook.com", "Report an issue", "hello world")
    expect(url.startsWith("mailto:support@tractbook.com?")).toBe(true)
    expect(url).toContain("subject=Report%20an%20issue")
    expect(url).not.toContain("+")
  })
  it("omits body when empty", () => {
    expect(buildMailto("a@b.com", "Hi")).toBe("mailto:a@b.com?subject=Hi")
  })
})

describe("diagnosticsText", () => {
  it("includes version, account and business", () => {
    const t = diagnosticsText({ version: "1.0.0", email: "a@b.com", businessId: "x1", path: "/account" })
    expect(t).toContain("App version: 1.0.0")
    expect(t).toContain("Account: a@b.com")
    expect(t).toContain("Business ID: x1")
  })
  it("falls back to unknown", () => {
    const t = diagnosticsText({ version: "1", email: "", businessId: "", path: "/" })
    expect(t).toContain("Account: unknown")
  })
})
