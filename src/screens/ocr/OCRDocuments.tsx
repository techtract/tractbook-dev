import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"

interface ExpenseRow {
  id: string
  total: number
  currency: string
  document_date: string | null
  payment_status: string
  is_flagged: boolean
  confidence_score: number | null
  vendor_name: string | null
  vendor_display: string | null
  category_name: string | null
}

type Filter = "all" | "needs_review" | "categorized"

export default function OCRDocuments() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view documents.")
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

    const { data, error: fetchError } = await supabase
      .from("expenses")
      .select("id, total, currency, document_date, payment_status, is_flagged, confidence_score, vendor_name, vendors(name), expense_categories(name)")
      .eq("business_id", membership.business_id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows: ExpenseRow[] = (data || []).map((row: any) => ({
      id: row.id,
      total: row.total,
      currency: row.currency || "USD",
      document_date: row.document_date,
      payment_status: row.payment_status,
      is_flagged: row.is_flagged,
      confidence_score: row.confidence_score,
      vendor_name: row.vendor_name,
      vendor_display: row.vendors?.name || row.vendor_name || "Unknown vendor",
      category_name: row.expense_categories?.name || null,
    }))

    setExpenses(rows)
    setLoading(false)
  }

  const filtered = expenses.filter((e) => {
    if (filter === "needs_review") return e.is_flagged || !e.category_name
    if (filter === "categorized") return !!e.category_name && !e.is_flagged
    return true
  })

  const now = new Date()
  const thisMonthTotals: Record<string, number> = {}
  expenses
    .filter((e) => {
      if (!e.document_date) return false
      const d = new Date(e.document_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .forEach((e) => { thisMonthTotals[e.currency] = (thisMonthTotals[e.currency] || 0) + (e.total || 0) })

  const needsReviewCount = expenses.filter((e) => e.is_flagged || !e.category_name).length

  return (
    <div className="h-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">tractbook</h1>
          <div className="flex items-center gap-3">
            <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-lg font-bold flex items-center justify-center">
              &#8942;
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white text-xs font-semibold flex items-center justify-center">
              JS
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button
            onClick={() => {}}
            className="flex-1 text-center py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-700"
          >
            Documents
          </button>
          <button
            onClick={() => navigate("/ocr/categories")}
            className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
          >
            Categories
          </button>
          <button
            onClick={() => navigate("/ocr/vendors")}
            className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
          >
            Vendors
          </button>
          <button
            onClick={() => navigate("/ocr/insights")}
            className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
          >
            Insights
          </button>
        </div>

        <h2 className="text-xl font-bold mb-1">OCR</h2>
        <p className="text-xs text-gray-500 mb-3">Scanned receipts and bills</p>

        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          <button
            onClick={() => navigate("/ocr/scan")}
            className="shrink-0 w-28 border border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center gap-1"
          >
            <span className="text-blue-700 text-lg font-bold">+</span>
            <span className="text-[11px] font-semibold text-gray-600 text-center">Scan receipt</span>
          </button>
          <div className="shrink-0 w-28 border border-green-200 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">This month</p>
            <p className="text-sm font-bold">
              {Object.keys(thisMonthTotals).length === 0
                ? "$0.00"
                : Object.entries(thisMonthTotals).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(" \u00B7 ")}
            </p>
          </div>
          <div className="shrink-0 w-28 border border-amber-200 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Needs review</p>
            <p className="text-sm font-bold">{needsReviewCount}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(["all", "needs_review", "categorized"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                filter === f
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {f === "all" ? "All" : f === "needs_review" ? "Needs review" : "Categorized"}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/ocr/scan")}
          className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold mb-5"
        >
          + Scan receipt
        </button>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading documents...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm mb-1">
              {expenses.length === 0 ? "No documents yet." : "No documents match this filter."}
            </p>
            {expenses.length === 0 && (
              <p className="text-gray-400 text-xs">Scan a receipt or bill to get started.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => (
              <div
                key={e.id}
                onClick={() => navigate(`/ocr/${e.id}`)}
                className="border border-gray-200 rounded-lg px-4 py-3 cursor-pointer active:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{e.vendor_display}</span>
                  <span className="font-bold text-gray-900 text-sm">{e.currency} ${e.total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">{e.document_date || ""}</span>
                  <span className={`text-xs font-semibold ${e.is_flagged ? "text-red-700" : "text-gray-500"}`}>
                    {e.is_flagged ? "Needs review" : e.payment_status === "paid" ? "Paid" : "Unpaid"}
                  </span>
                </div>
                {e.category_name && (
                  <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {e.category_name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="ocr" />
    </div>
  )
}




