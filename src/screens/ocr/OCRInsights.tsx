import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Chart, DoughnutController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js"
import { supabase } from "../../lib/supabase"

Chart.register(DoughnutController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip)

interface ExpenseRow {
  id: string
  total: number
  document_date: string | null
  is_flagged: boolean
  confidence_score: number | null
  category_id: string | null
}

export default function OCRInsights() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const donutRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const donutChartRef = useRef<Chart | null>(null)
  const barChartRef = useRef<Chart | null>(null)

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view insights.")
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
      .select("id, total, document_date, is_flagged, confidence_score, category_id")
      .eq("business_id", membership.business_id)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setExpenses(data || [])
    setLoading(false)
  }

  const scannedCount = expenses.length
  const avgConfidence = scannedCount > 0
    ? Math.round(expenses.reduce((s, e) => s + (e.confidence_score || 0), 0) / scannedCount)
    : 0
  const flaggedCount = expenses.filter((e) => e.is_flagged).length
  const cleanCount = expenses.filter((e) => !e.is_flagged && e.category_id).length
  const needsReviewCount = expenses.filter((e) => !e.is_flagged && !e.category_id).length

  const trustTotal = cleanCount + needsReviewCount + flaggedCount
  const cleanPct = trustTotal > 0 ? Math.round((cleanCount / trustTotal) * 100) : 0
  const reviewPct = trustTotal > 0 ? Math.round((needsReviewCount / trustTotal) * 100) : 0
  const flaggedPct = trustTotal > 0 ? Math.round((flaggedCount / trustTotal) * 100) : 0

  const now = new Date()
  const monthLabels: string[] = []
  const monthFlaggedCounts: number[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthLabels.push(d.toLocaleDateString(undefined, { month: "short" }))
    const count = expenses.filter((e) => {
      if (!e.is_flagged || !e.document_date) return false
      const ed = new Date(e.document_date)
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth()
    }).length
    monthFlaggedCounts.push(count)
  }

  useEffect(() => {
    if (loading || scannedCount === 0) return

    if (donutRef.current) {
      donutChartRef.current?.destroy()
      donutChartRef.current = new Chart(donutRef.current, {
        type: "doughnut",
        data: {
          labels: ["Clean", "Needs review", "Flagged"],
          datasets: [{
            data: [cleanPct, reviewPct, flaggedPct],
            backgroundColor: ["#16a34a", "#f59e0b", "#dc2626"],
            borderColor: "#ffffff",
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed}%` } },
          },
        },
      })
    }

    if (barRef.current) {
      barChartRef.current?.destroy()
      barChartRef.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels: monthLabels,
          datasets: [{
            data: monthFlaggedCounts,
            backgroundColor: "#2563eb",
            borderRadius: 4,
            maxBarThickness: 22,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
            x: { grid: { display: false } },
          },
        },
      })
    }

    return () => {
      donutChartRef.current?.destroy()
      barChartRef.current?.destroy()
    }
  }, [loading, scannedCount, cleanPct, reviewPct, flaggedPct, monthFlaggedCounts.join(",")])

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
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

      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        <button onClick={() => navigate("/ocr")} className="shrink-0 px-3 text-center py-2 text-xs font-semibold text-gray-500">
          Documents
        </button>
        <button onClick={() => navigate("/ocr/categories")} className="shrink-0 px-3 text-center py-2 text-xs font-semibold text-gray-500">
          Categories
        </button>
        <button onClick={() => navigate("/ocr/vendors")} className="shrink-0 px-3 text-center py-2 text-xs font-semibold text-gray-500">
          Vendors
        </button>
        <button className="shrink-0 px-3 text-center py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-700">
          Insights
        </button>
      </div>

      <h2 className="text-xl font-bold mb-1">Insights</h2>
      <p className="text-xs text-gray-500 mb-4">Confidence and fraud trends</p>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading insights...</p>
      ) : scannedCount === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm mb-1">No data yet.</p>
          <p className="text-gray-400 text-xs">Scan a few receipts or bills to see trends here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Scanned</p>
              <p className="text-base font-bold text-gray-900">{scannedCount}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Avg confidence</p>
              <p className="text-base font-bold text-gray-900">{avgConfidence}%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Flagged</p>
              <p className="text-base font-bold text-red-600">{flaggedCount}</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-700 mb-2">Document trust breakdown</p>
          <div className="flex flex-wrap gap-3 mb-2 text-[11px] text-gray-600">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-600" />Clean {cleanPct}%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />Needs review {reviewPct}%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600" />Flagged {flaggedPct}%</span>
          </div>
          <div className="relative h-40 mb-6">
            <canvas ref={donutRef} role="img" aria-label={`Donut chart: ${cleanPct}% clean, ${reviewPct}% needs review, ${flaggedPct}% flagged`} />
          </div>

          <p className="text-xs font-semibold text-gray-700 mb-2">Flagged documents per month</p>
          <div className="relative h-40 mb-4">
            <canvas ref={barRef} role="img" aria-label="Bar chart of flagged documents per month, last 6 months" />
          </div>
        </>
      )}
    </div>
  )
}
