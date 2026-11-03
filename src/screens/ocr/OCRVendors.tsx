import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"

interface VendorRow {
  id: string
  name: string
  count: number
  totals: Record<string, number>
}

export default function OCRVendors() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadVendors()
  }, [])

  async function loadVendors() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view vendors.")
      setLoading(false)
      return
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!membership) {
      setError("No business found for this account.")
      setLoading(false)
      return
    }

    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("business_id", membership.business_id)
      .order("name")

    const { data: expenses } = await supabase
      .from("expenses")
      .select("vendor_id, total, currency")
      .eq("business_id", membership.business_id)

    const byVendor: Record<string, { count: number; totals: Record<string, number> }> = {}

    for (const e of expenses || []) {
      if (!e.vendor_id) continue
      const cur = e.currency || "USD"
      if (!byVendor[e.vendor_id]) byVendor[e.vendor_id] = { count: 0, totals: {} }
      byVendor[e.vendor_id].count += 1
      byVendor[e.vendor_id].totals[cur] = (byVendor[e.vendor_id].totals[cur] || 0) + (e.total || 0)
    }

    const result: VendorRow[] = (vendors || []).map((v) => ({
      id: v.id,
      name: v.name,
      count: byVendor[v.id]?.count || 0,
      totals: byVendor[v.id]?.totals || {},
    }))

    setRows(result)
    setLoading(false)
  }

  return (
    <div className="h-screen glass-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-28">
        <h2 className="text-xl font-bold mb-1">OCR</h2>
        <p className="text-xs text-gray-500 mb-3">Spending by vendor</p>

        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button onClick={() => navigate("/ocr")} className="flex-1 text-center py-2 text-xs font-semibold text-gray-500">
            Documents
          </button>
          <button onClick={() => navigate("/ocr/categories")} className="flex-1 text-center py-2 text-xs font-semibold text-gray-500">
            Categories
          </button>
          <button onClick={() => {}} className="flex-1 text-center py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-700">
            Vendors
          </button>
          <button onClick={() => navigate("/ocr/insights")} className="flex-1 text-center py-2 text-xs font-semibold text-gray-500">
            Insights
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading vendors...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">No vendors yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">{r.name}</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {Object.entries(r.totals).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(" \u00B7 ")}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{r.count} document{r.count === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="ocr" />
    </div>
  )
}

