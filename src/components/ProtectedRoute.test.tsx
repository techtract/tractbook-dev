import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import ProtectedRoute from "./ProtectedRoute"

function makeBuilder(opts: any = {}) {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(opts.maybeSingleResponse ?? { data: null, error: null })
  )
  return builder
}

let membershipBuilder: any
let getSessionMock: any
let aalMock: any = () =>
  Promise.resolve({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null })

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn((...args: any[]) => getSessionMock(...args)),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn((...args: any[]) => aalMock(...args)),
      },
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => membershipBuilder),
  },
}))

function renderGuardedApp(startPath: string) {
  render(
    <MemoryRouter initialEntries={[startPath]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/verify-phone" element={<div>VERIFY PHONE PAGE</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>DASHBOARD PAGE</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe("ProtectedRoute - session + onboarding guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("with a session and two-step on but no code entered: redirects to /verify-2fa", async () => {
    getSessionMock = vi.fn(() =>
      Promise.resolve({ data: { session: { user: { id: "user-1" } } } })
    )
    aalMock = () =>
      Promise.resolve({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null })
    membershipBuilder = makeBuilder({
      maybeSingleResponse: { data: { business_id: "b1" }, error: null },
    })

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/verify-2fa" element={<div>VERIFY 2FA PAGE</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>DASHBOARD PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("VERIFY 2FA PAGE")).toBeInTheDocument()
    })
    expect(screen.queryByText("DASHBOARD PAGE")).not.toBeInTheDocument()
    aalMock = () =>
      Promise.resolve({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null })
  })

  it("with NO session: redirects to /login", async () => {
    getSessionMock = vi.fn(() => Promise.resolve({ data: { session: null } }))
    membershipBuilder = makeBuilder()

    renderGuardedApp("/dashboard")

    await waitFor(() => {
      expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument()
    })
    expect(screen.queryByText("DASHBOARD PAGE")).not.toBeInTheDocument()
  })

  it("with a session but NO active business_members row: redirects to /verify-phone (the real fix)", async () => {
    getSessionMock = vi.fn(() =>
      Promise.resolve({ data: { session: { user: { id: "user-1" } } } })
    )
    membershipBuilder = makeBuilder({
      maybeSingleResponse: { data: null, error: null },
    })

    renderGuardedApp("/dashboard")

    await waitFor(() => {
      expect(screen.getByText("VERIFY PHONE PAGE")).toBeInTheDocument()
    })
    expect(screen.queryByText("DASHBOARD PAGE")).not.toBeInTheDocument()
  })

  it("with a session AND an active business_members row: allows access to the protected route", async () => {
    getSessionMock = vi.fn(() =>
      Promise.resolve({ data: { session: { user: { id: "user-1" } } } })
    )
    membershipBuilder = makeBuilder({
      maybeSingleResponse: { data: { business_id: "biz-1" }, error: null },
    })

    renderGuardedApp("/dashboard")

    await waitFor(() => {
      expect(screen.getByText("DASHBOARD PAGE")).toBeInTheDocument()
    })
  })
})
