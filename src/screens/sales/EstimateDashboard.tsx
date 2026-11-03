import AppHeader from "../../components/AppHeader"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"

interface EstimateRow {
  id: string
  estimate_number: string
  status: string
  due_date: string | null
  total: number
  estimate_date: string
  customer_name: string
  business_line_category: string | null
}

type Filter = "all" | "draft" | "sent" | "accepted"

function statusInfo(status: string, dueDate: string | null): { text: string; className: string } {
  if (status === "accepted") return { text: "Accepted", className: "text-green-700" }
  if (!dueDate) return { text: status.charAt(0).toUpperCase() + status.slice(1), className: "text-gray-500" }

  const due = new Date(dueDate + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)} days`, className: "text-red-700" }
  if (diffDays <= 14) return { text: `Due in ${diffDays} days`, className: "text-amber-700" }
  return { text: status.charAt(0).toUpperCase() + status.slice(1), className: "text-gray-500" }
}

export default function EstimateDashboard() {
  const navigate = useNavigate()
  const [estimates, setEstimates] = useState<EstimateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [showKlaraBanner, setShowKlaraBanner] = useState(true)
  const [classifyingId, setClassifyingId] = useState<string | null>(null)

  useEffect(() => {
    loadEstimates()
  }, [])

  async function loadEstimates() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view estimates.")
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
      .from("estimates")
      .select("id, estimate_number, status, due_date, total, estimate_date, business_line_category, customers(name)")
      .eq("business_id", membership.business_id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows: EstimateRow[] = (data || []).map((row: any) => ({
      id: row.id,
      estimate_number: row.estimate_number,
      status: row.status,
      due_date: row.due_date,
      total: row.total,
      estimate_date: row.estimate_date,
      customer_name: row.customers?.name || "Unknown customer",
      business_line_category: row.business_line_category,
    }))

    setEstimates(rows)
    setLoading(false)
  }

  async function classifyEstimate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setClassifyingId(id)
    const { data, error: fnError } = await supabase.functions.invoke("classify-estimate", {
      body: { estimate_id: id },
    })
    setClassifyingId(null)

    if (fnError || !data?.category) {
      setError("Could not classify this estimate. Try again.")
      return
    }

    setEstimates((prev) =>
      prev.map((e2) => (e2.id === id ? { ...e2, business_line_category: data.category } : e2))
    )
  }

  const filtered = estimates.filter((e) => filter === "all" || e.status === filter)

  const draftTotal = estimates.filter((e) => e.status === "draft").reduce((s, e) => s + e.total, 0)
  const sentTotal = estimates.filter((e) => e.status === "sent").reduce((s, e) => s + e.total, 0)
  const acceptedTotal = estimates.filter((e) => e.status === "accepted").reduce((s, e) => s + e.total, 0)

  const expiringSoonCount = estimates.filter((e) => {
    if (e.status !== "sent" || !e.due_date) return false
    const info = statusInfo(e.status, e.due_date)
    return info.text.startsWith("Due in") || info.text.startsWith("Overdue")
  }).length

  return (
    <div className="h-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
      <AppHeader />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button className="flex-1 text-center py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-700">
          Estimates
        </button>
        <button
          onClick={() => navigate("/invoices")}
          className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
        >
          Invoices
        </button>
        <button
          onClick={() => navigate("/customers")}
          className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
        >
          Customers
        </button>
        <button
          onClick={() => navigate("/business")}
          className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
        >
          Business
        </button>
      </div>

      {showKlaraBanner && expiringSoonCount > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block" /> Klara suggests
            </span>
            <button onClick={() => setShowKlaraBanner(false)} className="text-gray-400 text-sm">
              &times;
            </button>
          </div>
          <p className="text-xs text-gray-700">
            {expiringSoonCount} estimate{expiringSoonCount > 1 ? "s" : ""} due soon —{" "}
            <span className="text-blue-700 font-semibold">send reminders now</span> before they lapse.
          </p>
        </div>
      )}

      <h2 className="text-xl font-bold mb-1">Estimates</h2>
      <p className="text-xs text-gray-500 mb-3">Estimates at a glance</p>

      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        <button
          onClick={() => navigate("/estimates/new")}
          className="shrink-0 w-28 border border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-blue-700 text-lg font-bold">+</span>
          <span className="text-[11px] font-semibold text-gray-600 text-center">New estimate</span>
        </button>
        <div className="shrink-0 w-28 border border-green-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Draft</p>
          <p className="text-sm font-bold">${draftTotal.toFixed(2)}</p>
        </div>
        <div className="shrink-0 w-28 border border-green-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Sent</p>
          <p className="text-sm font-bold">${sentTotal.toFixed(2)}</p>
        </div>
        <div className="shrink-0 w-28 border border-blue-600 bg-blue-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Accepted</p>
          <p className="text-sm font-bold">${acceptedTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "draft", "sent", "accepted"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === f
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/estimates/new")}
        className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold mb-5"
      >
        + Create estimate
      </button>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading estimates...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm mb-1">
            {estimates.length === 0 ? "No estimates yet." : "No estimates match this filter."}
          </p>
          {estimates.length === 0 && (
            <p className="text-gray-400 text-xs">Create your first estimate to get started.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const info = statusInfo(e.status, e.due_date)
            return (
              <div
                key={e.id}
                onClick={() => navigate(`/estimates/${e.id}`)}
                className="border border-gray-200 rounded-lg px-4 py-3 cursor-pointer active:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{e.customer_name}</span>
                  <span className="font-bold text-gray-900 text-sm">${e.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">
                    No. {e.estimate_number} &middot; {e.estimate_date}
                  </span>
                  <span className={`text-xs font-semibold ${info.className}`}>{info.text}</span>
                </div>
                <div className="flex items-center justify-between">
                  {e.business_line_category ? (
                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {e.business_line_category}
                    </span>
                  ) : (
                    <button
                      onClick={(ev) => classifyEstimate(e.id, ev)}
                      disabled={classifyingId === e.id}
                      className="text-[11px] font-semibold text-blue-700 disabled:text-gray-400"
                    >
                      {classifyingId === e.id ? "Classifying..." : "Classify with Klara"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
      <BottomNav active="sales" />
    </div>
  )
}




