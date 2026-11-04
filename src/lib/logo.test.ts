import { describe, it, expect } from "vitest"
import { validateLogoFile, logoStoragePath, LOGO_MAX_BYTES } from "./logo"

describe("validateLogoFile", () => {
  it("accepts png, jpg and webp under 1MB", () => {
    expect(validateLogoFile({ type: "image/png", size: 5000 })).toBeNull()
    expect(validateLogoFile({ type: "image/jpeg", size: 5000 })).toBeNull()
    expect(validateLogoFile({ type: "image/webp", size: LOGO_MAX_BYTES })).toBeNull()
  })
  it("rejects svg, gif and pdf", () => {
    expect(validateLogoFile({ type: "image/svg+xml", size: 100 })).toMatch(/PNG, JPG or WebP/)
    expect(validateLogoFile({ type: "image/gif", size: 100 })).toMatch(/PNG, JPG or WebP/)
    expect(validateLogoFile({ type: "application/pdf", size: 100 })).toMatch(/PNG, JPG or WebP/)
  })
  it("rejects files over 1MB and empty files", () => {
    expect(validateLogoFile({ type: "image/png", size: LOGO_MAX_BYTES + 1 })).toMatch(/larger than 1 MB/)
    expect(validateLogoFile({ type: "image/png", size: 0 })).toMatch(/empty/)
  })
})

describe("logoStoragePath", () => {
  it("keeps the logo inside the business folder", () => {
    expect(logoStoragePath("biz-1", "image/png")).toBe("biz-1/logo.png")
    expect(logoStoragePath("biz-1", "image/jpeg")).toBe("biz-1/logo.jpg")
  })
})
