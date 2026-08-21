import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import CreateInvoice from "./CreateInvoice"
import CreateEstimate from "./CreateEstimate"

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
    data: [
      { id: "cust-1", name: "Acme Corp" },
      { id: "cust-2", name: "Beta LLC" },
      { id: "cust-3", name: "Zenith Co" },
    ],
    error: null,
  },
})
const invoicesBuilder = makeBuilder({ thenResponse: { data: [], error: null } })
const estimatesBuilder = makeBuilder({ thenResponse: { data: [], error: null } })

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
        case "estimates":
          return estimatesBuilder
        default:
          return makeBuilder()
      }
    }),
  },
}))

function runCustomerPickerTests(name: string, Component: React.ComponentType) {
  describe(`${name} - customer picker regression`, () => {
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
        resolve({
          data: [
            { id: "cust-1", name: "Acme Corp" },
            { id: "cust-2", name: "Beta LLC" },
            { id: "cust-3", name: "Zenith Co" },
          ],
          error: null,
        })
    })

    it("REGRESSION: shows NO customers before anything is typed", async () => {
      render(
        <MemoryRouter>
          <Component />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search customers...")).toBeInTheDocument()
      })

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument()
      expect(screen.queryByText("Beta LLC")).not.toBeInTheDocument()
      expect(screen.queryByText("Zenith Co")).not.toBeInTheDocument()
      expect(screen.getByText("No customers found.")).toBeInTheDocument()
    })

    it("filters to matching customers as the user types", async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <Component />
        </MemoryRouter>
      )

      const searchInput = await screen.findByPlaceholderText("Search customers...")
      await user.type(searchInput, "Acme")

      expect(screen.getByText("Acme Corp")).toBeInTheDocument()
      expect(screen.queryByText("Beta LLC")).not.toBeInTheDocument()
      expect(screen.queryByText("Zenith Co")).not.toBeInTheDocument()
    })

    it("matches case-insensitively", async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <Component />
        </MemoryRouter>
      )

      const searchInput = await screen.findByPlaceholderText("Search customers...")
      await user.type(searchInput, "beta")

      expect(screen.getByText("Beta LLC")).toBeInTheDocument()
    })
  })
}

runCustomerPickerTests("CreateInvoice", CreateInvoice)
runCustomerPickerTests("CreateEstimate", CreateEstimate)
