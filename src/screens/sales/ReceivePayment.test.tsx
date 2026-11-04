import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import ReceivePayment from "./ReceivePayment"

// selectQueue = what each successive SELECT resolves with. The last entry repeats.
// Order of selects on the payments table: 1) balance on mount, 2) balance re-check on submit,
// 3) the "is it fully paid now" check after the insert.
function makeBuilder(opts: any = {}) {
  const builder: any = {}
  let lastOp: string | null = null
  const queue: any[] = opts.selectQueue ? [...opts.selectQueue] : []
  builder.select = vi.fn(() => {
    lastOp = "select"
    return builder
  })
  builder.eq = vi.fn(() => builder)
  builder.insert = vi.fn(() => {
    lastOp = "insert"
    return builder
  })
  builder.update = vi.fn(() => {
    lastOp = "update"
    return builder
  })
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(opts.maybeSingleResponse ?? { data: null, error: null })
  )
  builder.then = (resolve: any) => {
    if (lastOp === "insert")
      return resolve(opts.insertResponse ?? { data: null, error: null })
    if (lastOp === "select") {
      if (queue.length) {
        const next = queue.length > 1 ? queue.shift() : queue[0]
        return resolve({ data: next.map((amount: number) => ({ amount })), error: null })
      }
      return resolve({ data: [], error: null })
    }
    if (lastOp === "update")
      return resolve(opts.updateResponse ?? { data: null, error: null })
    return resolve({ data: null, error: null })
  }
  return builder
}

let paymentsBuilder: any
let invoiceActivityBuilder: any
let invoicesBuilder: any

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "user-1", email: "test@tractbook.com" } } })
      ),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "payments":
          return paymentsBuilder
        case "invoice_activity":
          return invoiceActivityBuilder
        case "invoices":
          return invoicesBuilder
        default:
          return makeBuilder()
      }
    }),
  },
}))

function renderReceivePayment() {
  render(
    <MemoryRouter initialEntries={["/invoices/inv-1/receive-payment"]}>
      <Routes>
        <Route path="/invoices/:id/receive-payment" element={<ReceivePayment />} />
      </Routes>
    </MemoryRouter>
  )
}

function setup(selectQueue: number[][]) {
  paymentsBuilder = makeBuilder({ insertResponse: { error: null }, selectQueue })
  invoiceActivityBuilder = makeBuilder({ insertResponse: { error: null } })
  invoicesBuilder = makeBuilder({
    maybeSingleResponse: { data: { total: 500 }, error: null },
    updateResponse: { error: null },
  })
}

describe("ReceivePayment - payment math and guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the balance due once it has loaded", async () => {
    setup([[]])
    renderReceivePayment()
    expect(await screen.findByText(/Balance due \$500\.00/)).toBeInTheDocument()
  })

  it("PARTIAL payment ($200 of $500) does NOT mark the invoice paid", async () => {
    setup([[], [], [200]])
    const user = userEvent.setup()
    renderReceivePayment()
    await screen.findByText(/Balance due/)

    await user.type(screen.getByPlaceholderText("0.00"), "200")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    await waitFor(() => {
      expect(paymentsBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ invoice_id: "inv-1", amount: 200 })
      )
    })
    expect(invoicesBuilder.update).not.toHaveBeenCalled()
  })

  it("FULL payment ($500 of $500) marks the invoice paid", async () => {
    setup([[], [], [500]])
    const user = userEvent.setup()
    renderReceivePayment()
    await screen.findByText(/Balance due/)

    await user.type(screen.getByPlaceholderText("0.00"), "500")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    await waitFor(() => {
      expect(invoicesBuilder.update).toHaveBeenCalledWith({ status: "paid" })
    })
  })

  it("FIXED: an OVERPAYMENT ($600 on a $500 invoice) is blocked with a clear message", async () => {
    setup([[]])
    const user = userEvent.setup()
    renderReceivePayment()
    await screen.findByText(/Balance due/)

    await user.type(screen.getByPlaceholderText("0.00"), "600")

    expect(
      screen.getByText("The amount is more than the balance due ($500.00).")
    ).toBeInTheDocument()
    const submitButton = screen.getByRole("button", { name: /submit/i })
    expect(submitButton).toBeDisabled()

    await user.click(submitButton)
    expect(paymentsBuilder.insert).not.toHaveBeenCalled()
  })

  it("the balance accounts for earlier payments ($300 already paid leaves $200)", async () => {
    setup([[300]])
    const user = userEvent.setup()
    renderReceivePayment()
    expect(await screen.findByText(/Balance due \$200\.00/)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText("0.00"), "250")
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled()
  })

  it("a fully paid invoice does not accept another payment", async () => {
    setup([[500]])
    const user = userEvent.setup()
    renderReceivePayment()
    await screen.findByText(/Balance due \$0\.00/)

    await user.type(screen.getByPlaceholderText("0.00"), "10")
    expect(screen.getByText("This invoice is already fully paid.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled()
  })

  it("a negative amount is blocked by the Submit button", async () => {
    setup([[]])
    const user = userEvent.setup()
    renderReceivePayment()
    await screen.findByText(/Balance due/)

    await user.type(screen.getByPlaceholderText("0.00"), "-50")

    const submitButton = screen.getByRole("button", { name: /submit/i })
    expect(submitButton).toBeDisabled()
    await user.click(submitButton)
    expect(paymentsBuilder.insert).not.toHaveBeenCalled()
  })

  it("more than two decimal places is blocked", async () => {
    setup([[]])
    const user = userEvent.setup()
    renderReceivePayment()
    await screen.findByText(/Balance due/)

    await user.type(screen.getByPlaceholderText("0.00"), "10.123")
    expect(screen.getByText("Use at most two decimal places.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled()
  })
})
