import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

const getSession = vi.fn()
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSession(...a),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
  },
}))

import AutoLock from "./AutoLock"

const session = (providers: string[]) => ({
  data: { session: { user: { email: "a@b.com", app_metadata: { providers } } } },
})

describe("AutoLock", () => {
  beforeEach(() => {
    localStorage.clear()
    getSession.mockReset()
  })

  it("locks on load when the last activity was over 2 minutes ago", async () => {
    getSession.mockResolvedValue(session(["email"]))
    localStorage.setItem("tb_last_active", String(Date.now() - 3 * 60 * 1000))
    render(<AutoLock />)
    await waitFor(() => expect(screen.getByText("Tractbook is locked")).toBeTruthy())
    expect(screen.getByLabelText("Password")).toBeTruthy()
  })

  it("stays unlocked when recently active", async () => {
    getSession.mockResolvedValue(session(["email"]))
    localStorage.setItem("tb_last_active", String(Date.now() - 10 * 1000))
    render(<AutoLock />)
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText("Tractbook is locked")).toBeNull()
  })

  it("does nothing when signed out", async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    localStorage.setItem("tb_last_active", String(Date.now() - 10 * 60 * 1000))
    render(<AutoLock />)
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText("Tractbook is locked")).toBeNull()
  })

  it("respects the off switch", async () => {
    getSession.mockResolvedValue(session(["email"]))
    localStorage.setItem("tb_autolock_enabled", "off")
    localStorage.setItem("tb_last_active", String(Date.now() - 10 * 60 * 1000))
    render(<AutoLock />)
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText("Tractbook is locked")).toBeNull()
  })

  it("asks Google users to sign in again", async () => {
    getSession.mockResolvedValue(session(["google"]))
    localStorage.setItem("tb_last_active", String(Date.now() - 3 * 60 * 1000))
    render(<AutoLock />)
    await waitFor(() => expect(screen.getByText("Sign in again")).toBeTruthy())
    expect(screen.queryByLabelText("Password")).toBeNull()
  })
})
