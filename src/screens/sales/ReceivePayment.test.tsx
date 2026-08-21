import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import ReceivePayment from "./ReceivePayment"

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
    if (lastOp === "select")
      return resolve(opts.selectResponse ?? { data: [], error: null })
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

describe("ReceivePayment - payment math", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paymentsBuilder = makeBuilder({ insertResponse: { error: null } })
    invoiceActivityBuilder = makeBuilder({ insertResponse: { error: null } })
    invoicesBuilder = makeBuilder({
      maybeSingleResponse: { data: { total: 500 }, error: null },
      updateResponse: { error: null },
    })
  })

  it("PARTIAL payment ($200 of $500) does NOT mark the invoice paid", async () => {
    paymentsBuilder.then = (resolve: any) => {
      resolve({ data: [{ amount: 200 }], error: null })
    }

    const user = userEvent.setup()
    renderReceivePayment()

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
    paymentsBuilder.then = (resolve: any) => {
      resolve({ data: [{ amount: 500 }], error: null })
    }

    const user = userEvent.setup()
    renderReceivePayment()

    await user.type(screen.getByPlaceholderText("0.00"), "500")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    await waitFor(() => {
      expect(invoicesBuilder.update).toHaveBeenCalledWith({ status: "paid" })
    })
  })

  it("REAL GAP (documented, not silently fixed): OVERPAYMENT ($600 on a $500 invoice) still marks paid with no cap or warning", async () => {
    paymentsBuilder.then = (resolve: any) => {
      resolve({ data: [{ amount: 600 }], error: null })
    }

    const user = userEvent.setup()
    renderReceivePayment()

    await user.type(screen.getByPlaceholderText("0.00"), "600")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    await waitFor(() => {
      expect(invoicesBuilder.update).toHaveBeenCalledWith({ status: "paid" })
    })
  })

  it("FIXED: a negative amount is now blocked by the Submit button", async () => {
    const user = userEvent.setup()
    renderReceivePayment()

    const amountInput = screen.getByPlaceholderText("0.00")
    await user.type(amountInput, "-50")

    const submitButton = screen.getByRole("button", { name: /submit/i })
    expect(submitButton).toBeDisabled()

    await user.click(submitButton)

    expect(paymentsBuilder.insert).not.toHaveBeenCalled()
  })
})

