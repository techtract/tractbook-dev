import { describe, it, expect, vi, beforeEach } from "vitest"

function makeBuilder(opts: any = {}) {
  const builder: any = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.then = (resolve: any) =>
    resolve(opts.thenResponse ?? { data: [], error: null })
  return builder
}

let invoicesBuilder: any
let estimatesBuilder: any

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "invoices") return invoicesBuilder
      if (table === "estimates") return estimatesBuilder
      return makeBuilder()
    }),
  },
}))

import { generateNextInvoiceNumber } from "./CreateInvoice"
import { generateNextEstimateNumber } from "./CreateEstimate"

describe("Invoice/Estimate numbering", () => {
  beforeEach(() => {
    invoicesBuilder = makeBuilder({
      thenResponse: {
        data: [{ invoice_number: "INV-0001" }, { invoice_number: "INV-0002" }],
        error: null,
      },
    })
    estimatesBuilder = makeBuilder({
      thenResponse: {
        data: [{ estimate_number: "EST-0005" }],
        error: null,
      },
    })
  })

  it("generates the next sequential invoice number", async () => {
    const next = await generateNextInvoiceNumber("biz-1")
    expect(next).toBe("INV-0003")
  })

  it("generates the next sequential estimate number", async () => {
    const next = await generateNextEstimateNumber("biz-1")
    expect(next).toBe("EST-0006")
  })

  it("REAL RISK: two rapid calls before either is saved produce the SAME number", async () => {
    const [first, second] = await Promise.all([
      generateNextInvoiceNumber("biz-1"),
      generateNextInvoiceNumber("biz-1"),
    ])
    expect(first).toBe(second)
  })
})
