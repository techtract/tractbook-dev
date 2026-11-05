import { describe, it, expect, beforeEach } from "vitest"
import { buildBusinessArgs, clearDraft, isValidEmail, isValidYear, loadDraft, saveDraft } from "./onboardingDraft"

beforeEach(() => {
  window.sessionStorage.clear()
})

describe("onboarding draft", () => {
  it("keeps answers so Back does not wipe a screen", () => {
    saveDraft({ firstName: "Rakesh", businessName: "Acme" })
    saveDraft({ yearStarted: "2021" })
    expect(loadDraft()).toEqual({ firstName: "Rakesh", businessName: "Acme", yearStarted: "2021" })
  })
  it("clears once setup is done", () => {
    saveDraft({ firstName: "Rakesh" })
    clearDraft()
    expect(loadDraft()).toEqual({})
  })
  it("survives broken stored data", () => {
    window.sessionStorage.setItem("tractbook.onboarding.draft", "{not json")
    expect(loadDraft()).toEqual({})
  })
})

describe("validation", () => {
  it("accepts a sensible start year only", () => {
    const now = new Date("2026-11-05")
    expect(isValidYear("2021", now)).toBe(true)
    expect(isValidYear("2026", now)).toBe(true)
    expect(isValidYear("2027", now)).toBe(false)
    expect(isValidYear("1899", now)).toBe(false)
    expect(isValidYear("20", now)).toBe(false)
    expect(isValidYear("", now)).toBe(false)
  })
  it("checks email shape", () => {
    expect(isValidEmail("a@firm.ca")).toBe(true)
    expect(isValidEmail(" a@firm.ca ")).toBe(true)
    expect(isValidEmail("nope")).toBe(false)
  })
})

describe("buildBusinessArgs", () => {
  it("maps the draft and defaults to Canada", () => {
    const a = buildBusinessArgs({ businessName: " Acme ", yearStarted: "2021", businessNumber: "123456789" })
    expect(a.p_name).toBe("Acme")
    expect(a.p_year_started).toBe(2021)
    expect(a.p_country).toBe("CA")
    expect(a.p_accountant_email).toBeNull()
  })
  it("drops tax numbers when the person said they have none", () => {
    const a = buildBusinessArgs({ noBN: true, businessNumber: "123", noTaxReg: true, taxRegNumber: "456" })
    expect(a.p_business_number).toBeNull()
    expect(a.p_tax_registration_number).toBeNull()
  })
  it("only invites when the answer is yes", () => {
    expect(buildBusinessArgs({ accountantChoice: "no", accountantEmail: "a@b.ca" }).p_accountant_email).toBeNull()
    const yes = buildBusinessArgs({ accountantChoice: "yes", accountantEmail: " A@B.ca ", accountantName: " Foram " })
    expect(yes.p_accountant_email).toBe("a@b.ca")
    expect(yes.p_accountant_name).toBe("Foram")
  })
})
