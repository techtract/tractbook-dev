import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import CreateInvoice from "./CreateInvoice"

function makeBuilder(opts: any = {}) {
  const builder: any = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.insert = vi.fn(chain)
  builder.update = vi.fn(chain)
  builder.delete = vi.fn(chain)
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(opts.maybeSingleResponse ?? { data: null, error: null })
  )
  builder.single = vi.fn(() =>
    Promise.resolve(opts.singleResponse ?? { data: null, error: null })
  )
  builder.then = (resolve: any) =>
    resolve(opts.thenResponse ?? { data: [], error: null })
  return builder
}

const businessMembersBuilder = makeBuilder({
  maybeSingleResponse: { data: { business_id: "biz-1" }, error: null },
})
const businessesBuilder = makeBuilder({
  maybeSingleResponse: {
    data: { name: "Acme Co", region: "Ontario", country: "CA" },
    error: null,
  },
})
const customersBuilder = makeBuilder({
  thenResponse: {
    data: [{ id: "cust-1", name: "Acme Customer" }],
    error: null,
  },
})
const invoicesBuilder = makeBuilder({
  thenResponse: { data: [], error: null },
  singleResponse: { data: { id: "inv-created" }, error: null },
})
const lineItemsBuilder = makeBuilder({
  thenResponse: { error: null },
})

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "user-1" } } })
      ),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "business_members":
          return businessMembersBuilder
        case "businesses":
          return businessesBuilder
        case "customers":
          return customersBuilder
        case "invoices":
          return invoicesBuilder
        case "invoice_line_items":
          return lineItemsBuilder
        default:
          return makeBuilder()
      }
    }),
  },
}))

describe("CreateInvoice - double-submit guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    businessMembersBuilder.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: { business_id: "biz-1" }, error: null })
    )
    businessesBuilder.maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: { name: "Acme Co", region: "Ontario", country: "CA" },
        error: null,
      })
    )
    customersBuilder.then = (resolve: any) =>
      resolve({ data: [{ id: "cust-1", name: "Acme Customer" }], error: null })
    invoicesBuilder.then = (resolve: any) => resolve({ data: [], error: null })
    invoicesBuilder.single = vi.fn(() =>
      Promise.resolve({ data: { id: "inv-created" }, error: null })
    )
    lineItemsBuilder.then = (resolve: any) => resolve({ error: null })
  })

  it("only creates ONE invoice even if Save is clicked twice rapidly", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CreateInvoice />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search customers...")).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText("Search customers..."), "Acme")
    await user.click(await screen.findByText("Acme Customer"))

    const itemNameInput = screen.getByPlaceholderText("Item name")
    await user.type(itemNameInput, "Website design")

    const saveButton = screen.getByRole("button", { name: /save draft/i })

    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(invoicesBuilder.single).toHaveBeenCalled()
    })

    expect(invoicesBuilder.insert).toHaveBeenCalledTimes(1)
    expect(invoicesBuilder.single).toHaveBeenCalledTimes(1)
    expect(lineItemsBuilder.insert).toHaveBeenCalledTimes(1)
  })
})
