export interface SetupFacts {
  customers: number
  documents: number // estimates + invoices
  receipts: number
  paymentsConnected: boolean
}

export interface SetupStep {
  key: "business" | "customer" | "document" | "receipt" | "payments"
  label: string
  done: boolean
  path: string
}

export interface SetupProgress {
  steps: SetupStep[]
  doneCount: number
  percent: number
  next: SetupStep | null
  complete: boolean
}

// The first-run checklist shown on the dashboard. Creating the business happens during
// onboarding, so a person who can see the dashboard has always finished that step.
export function getSetupProgress(f: SetupFacts): SetupProgress {
  const steps: SetupStep[] = [
    { key: "business", label: "Create your business", done: true, path: "/business" },
    { key: "customer", label: "Add your first customer", done: f.customers > 0, path: "/customers/new" },
    { key: "document", label: "Create an estimate or invoice", done: f.documents > 0, path: "/estimates/new" },
    { key: "receipt", label: "Scan your first receipt", done: f.receipts > 0, path: "/ocr/scan" },
    { key: "payments", label: "Get paid faster", done: f.paymentsConnected, path: "/business" },
  ]
  const doneCount = steps.filter((s) => s.done).length
  return {
    steps,
    doneCount,
    percent: Math.round((doneCount / steps.length) * 100),
    next: steps.find((s) => !s.done) ?? null,
    complete: doneCount === steps.length,
  }
}
