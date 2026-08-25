import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"

interface CategoryRow {
  id: string
  name: string
  count: number
  total: number
}

export default function OCRCategories() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view categories.")
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

    const { data: categories } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("business_id", membership.business_id)
      .order("name")

    const { data: expenses } = await supabase
      .from("expenses")
      .select("category_id, total")
      .eq("business_id", membership.business_id)

    const byCategory: Record<string, { count: number; total: number }> = {}
    let uncategorizedCount = 0
    let uncategorizedTotal = 0

    for (const e of expenses || []) {
      if (!e.category_id) {
        uncategorizedCount += 1
        uncategorizedTotal += e.total || 0
        continue
      }
      if (!byCategory[e.category_id]) byCategory[e.category_id] = { count: 0, total: 0 }
      byCategory[e.category_id].count += 1
      byCategory[e.category_id].total += e.total || 0
    }

    const result: CategoryRow[] = (categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      count: byCategory[c.id]?.count || 0,
      total: byCategory[c.id]?.total || 0,
    }))

    if (uncategorizedCount > 0) {
      result.push({ id: "uncategorized", name: "Uncategorized", count: uncategorizedCount, total: uncategorizedTotal })
    }

    setRows(result)
    setLoading(false)
  }

  return (
    <div className="h-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <h2 className="text-xl font-bold mb-1">OCR</h2>
        <p className="text-xs text-gray-500 mb-3">Spending by category</p>

        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button onClick={() => navigate("/ocr")} className="flex-1 text-center py-2 text-xs font-semibold text-gray-500">
            Documents
          </button>
          <button onClick={() => {}} className="flex-1 text-center py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-700">
            Categories
          </button>
          <button onClick={() => navigate("/ocr/vendors")} className="flex-1 text-center py-2 text-xs font-semibold text-gray-500">
            Vendors
          </button>
          <button onClick={() => navigate("/ocr/insights")} className="flex-1 text-center py-2 text-xs font-semibold text-gray-500">
            Insights
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading categories...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">No categories yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">{r.name}</span>
                  <span className="font-bold text-gray-900 text-sm">${r.total.toFixed(2)}</span>
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
