import { describe, it, expect } from "vitest"
import { canSkipPhoneVerification, signedInWithGoogle, isTeamTestUser } from "./phoneSkip"

describe("phone verification skip", () => {
  it("lets Google sign-ins skip", () => {
    expect(canSkipPhoneVerification({ email: "a@gmail.com", user: { app_metadata: { provider: "google" } } })).toBe(true)
    expect(canSkipPhoneVerification({ email: "a@gmail.com", user: { app_metadata: { providers: ["email", "google"] } } })).toBe(true)
    expect(canSkipPhoneVerification({ email: "a@gmail.com", user: { identities: [{ provider: "google" }] } })).toBe(true)
  })
  it("does not let email and password sign-ins skip", () => {
    expect(canSkipPhoneVerification({ email: "a@gmail.com", user: { app_metadata: { provider: "email" } } })).toBe(false)
    expect(canSkipPhoneVerification({ email: "a@gmail.com", user: null })).toBe(false)
  })
  it("keeps the team exception and dev mode", () => {
    expect(isTeamTestUser("Someone@NxtWave.ca")).toBe(true)
    expect(canSkipPhoneVerification({ email: "x@nxtwave.ca", user: null })).toBe(true)
    expect(canSkipPhoneVerification({ email: "x@y.com", user: null, isDev: true })).toBe(true)
  })
  it("detects google", () => {
    expect(signedInWithGoogle(undefined)).toBe(false)
  })
})
