import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import RecordPayment from "./RecordPayment"

function makeBuilder(opts: any = {}) {
  const builder: any = {}
  let lastOp: string | null = null
  builder.select = vi.fn(() => {
    lastOp = "select"
    return builder
  })
  builder.eq = vi.fn(() => builder)
  builder.insert = vi.fn(() => {
    lastOp = "insert"
    return builder
  })
  builder.maybeSingle = vi.fn(() => Promise.resolve(opts.maybeSingleResponse ?? { data: null, error: null }))
  builder.then = (resolve: any) => {
    if (lastOp === "select") return resolve({ data: (opts.payments ?? []).map((amount: number) => ({ amount })), error: null })
    return resolve({ data: null, error: null })
  }
  return builder
}

let paymentsBuilder: any
let estimatesBuilder: any

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1", email: "test@tractbook.com" } } })),
    },
    from: vi.fn((table: string) => {
      if (table === "payments") return paymentsBuilder
      if (table === "estimates") return estimatesBuilder
      return makeBuilder()
    }),
  },
}))

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/estimates/est-1/payment"]}>
      <Routes>
        <Route path="/estimates/:id/payment" element={<RecordPayment />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("RecordPayment (estimate deposits) - guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paymentsBuilder = makeBuilder({ payments: [100] })
    estimatesBuilder = makeBuilder({ maybeSingleResponse: { data: { total: 500 }, error: null } })
  })

  it("shows what is still to pay", async () => {
    renderPage()
    expect(await screen.findByText(/Still to pay \$400\.00/)).toBeInTheDocument()
  })

  it("blocks a negative amount", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/Still to pay/)
    await user.type(screen.getByPlaceholderText("0.00"), "-20")
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled()
  })

  it("blocks more than is still to pay", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/Still to pay/)
    await user.type(screen.getByPlaceholderText("0.00"), "450")
    expect(screen.getByText("The amount is more than the balance due ($400.00).")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled()
  })

  it("saves an amount within the balance", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/Still to pay/)
    await user.type(screen.getByPlaceholderText("0.00"), "250")
    await user.click(screen.getByRole("button", { name: /submit/i }))
    await waitFor(() => {
      expect(paymentsBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ estimate_id: "est-1", amount: 250 })
      )
    })
  })
})
