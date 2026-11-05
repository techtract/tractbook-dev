import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import AppHeader from "../../components/AppHeader"
import BottomNav from "../../components/BottomNav"
import { useAccount } from "../../hooks/useAccount"

interface Counts {
  invoices: number | null
  estimates: number | null
  customers: number | null
}

export default function AccountantHome() {
  const navigate = useNavigate()
  const { businessId, businessName } = useAccount()
  const [counts, setCounts] = useState<Counts>({ invoices: null, estimates: null, customers: null })

  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    async function load() {
      const count = async (table: string) => {
        const { count: n, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
        if (error) console.error(`accountant count failed: ${table}`, error)
        return error ? null : n ?? 0
      }
      const [invoices, estimates, customers] = await Promise.all([
        count("invoices"),
        count("estimates"),
        count("customers"),
      ])
      if (!cancelled) setCounts({ invoices, estimates, customers })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [businessId])

  const rows = [
    { label: "Invoices", sub: "Review what's been billed and paid", path: "/invoices", n: counts.invoices },
    { label: "Estimates", sub: "Quotes sent to customers", path: "/estimates", n: counts.estimates },
    { label: "Customers", sub: "Who the business bills", path: "/customers", n: counts.customers },
    { label: "Receipts and expenses", sub: "Scanned receipts and categories", path: "/ocr", n: null },
  ]

  return (
    <div className="h-screen glass-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28">
        <AppHeader />
        <h1 className="text-2xl font-bold mb-1">Accountant view</h1>
        <p className="text-body text-sm mb-6">
          You're reviewing {businessName || "this business"}. You can look at everything below but not change it.
        </p>

        <div className="border border-border rounded-2xl overflow-hidden bg-white mb-6">
          {rows.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => navigate(r.path)}
              className="w-full px-4 py-3.5 border-t border-border first:border-t-0 flex items-center gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink">{r.label}</div>
                <div className="text-xs text-body">{r.sub}</div>
              </div>
              {r.n !== null && (
                <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#eef3ff] text-brand-blue-dark text-xs font-semibold">
                  {r.n}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold tracking-wider uppercase text-body mb-2">Coming to your view</div>
        <div className="border border-border rounded-2xl overflow-hidden bg-white">
          {[
            { label: "Journal entries", sub: "Every entry, ready for review" },
            { label: "CRA status", sub: "GST/HST and filing deadlines" },
          ].map((r) => (
            <div key={r.label} className="px-4 py-3.5 border-t border-border first:border-t-0 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-gray-400">{r.label}</div>
                <div className="text-xs text-gray-400">{r.sub}</div>
              </div>
              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">Soon</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="dashboard" />
    </div>
  )
}
