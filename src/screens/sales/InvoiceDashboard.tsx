import AppHeader from "../../components/AppHeader"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"
import { invoiceState, invoiceStatusInfo } from "../../lib/documentStatus"

interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  due_date: string | null
  total: number
  invoice_date: string
  customer_name: string
}

type Filter = "all" | "draft" | "sent" | "overdue" | "paid"

export default function InvoiceDashboard() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to view invoices.")
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
      .from("invoices")
      .select("id, invoice_number, status, due_date, total, invoice_date, customers(name)")
      .eq("business_id", membership.business_id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows: InvoiceRow[] = (data || []).map((row: any) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      status: row.status,
      due_date: row.due_date,
      total: row.total,
      invoice_date: row.invoice_date,
      customer_name: row.customers?.name || "Unknown customer",
    }))

    setInvoices(rows)
    setLoading(false)
  }

  const filtered = invoices.filter((i) => {
    if (filter === "all") return true
    if (filter === "overdue") return invoiceState(i.status, i.due_date) === "overdue"
    return i.status === filter
  })

  const draftTotal = invoices.filter((i) => i.status === "draft").reduce((s, i) => s + i.total, 0)
  const notPaidTotal = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + i.total, 0)
  const paidTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0)
  const overdueInvoices = invoices.filter((i) => invoiceState(i.status, i.due_date) === "overdue")
  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.total, 0)

  const overdueCount = overdueInvoices.length
  const dueSoonCount = invoices.filter((i) => {
    const info = invoiceStatusInfo(i.status, i.due_date)
    return info.state === "sent" && (info.text.startsWith("Due in") || info.text === "Due today")
  }).length

  return (
    <div className="h-screen glass-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-28">
      <AppHeader />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => navigate("/estimates")}
          className="flex-1 text-center py-2 text-xs font-semibold text-gray-500"
        >
          Estimates
        </button>
        <button className="flex-1 text-center py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-700">
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

      {(dueSoonCount > 0 || overdueCount > 0) && (
        <div className="mb-4 p-3 bg-brand-success-soft border border-brand-success-line rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block" /> Klara suggests
            </span>
          </div>
          <p className="text-xs text-gray-700">
            {overdueCount > 0 && (
              <>
                <span className="font-semibold text-red-700">{overdueCount} invoice{overdueCount > 1 ? "s" : ""} overdue</span>
                {dueSoonCount > 0 ? ` and ${dueSoonCount} due soon` : ""} —{" "}
                <span className="text-blue-700 font-semibold">follow up</span> to get paid.
              </>
            )}
            {overdueCount === 0 && (
              <>
                {dueSoonCount} invoice{dueSoonCount > 1 ? "s" : ""} due soon —{" "}
                <span className="text-blue-700 font-semibold">send reminders now</span> before they're overdue.
              </>
            )}
          </p>
        </div>
      )}

      <h2 className="text-xl font-bold mb-1">Invoices</h2>
      <p className="text-xs text-gray-500 mb-3">Invoices at a glance</p>

      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        <button
          onClick={() => navigate("/invoices/new")}
          className="shrink-0 w-28 border border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-blue-700 text-lg font-bold">+</span>
          <span className="text-[11px] font-semibold text-gray-600 text-center">New invoice</span>
        </button>
        <div className="shrink-0 w-28 border border-brand-success-line rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Draft</p>
          <p className="text-sm font-bold">${draftTotal.toFixed(2)}</p>
        </div>
        <div className="shrink-0 w-28 border border-amber-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Not paid</p>
          <p className="text-sm font-bold">${notPaidTotal.toFixed(2)}</p>
        </div>
        <div className="shrink-0 w-28 border border-red-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Overdue</p>
          <p className="text-sm font-bold">${overdueTotal.toFixed(2)}</p>
        </div>
        <div className="shrink-0 w-28 border border-blue-600 bg-blue-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Paid</p>
          <p className="text-sm font-bold">${paidTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["all", "draft", "sent", "overdue", "paid"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === f
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {f === "sent" ? "Not paid" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/invoices/new")}
        className="w-full mb-5 btn-glass btn-glass-success min-h-11"
      >
        + Create invoice
      </button>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading invoices...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm mb-1">
            {invoices.length === 0 ? "No invoices yet." : "No invoices match this filter."}
          </p>
          {invoices.length === 0 && (
            <p className="text-gray-400 text-xs">Convert an accepted estimate, or create an invoice directly.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => {
            const info = invoiceStatusInfo(i.status, i.due_date)
            return (
              <div
                key={i.id}
                onClick={() => navigate(`/invoices/${i.id}`)}
                className="border border-gray-200 rounded-lg px-4 py-3 cursor-pointer active:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{i.customer_name}</span>
                  <span className="font-bold text-gray-900 text-sm">${i.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    No. {i.invoice_number} &middot; {i.invoice_date}
                  </span>
                  <span className={`text-xs font-semibold ${info.className}`}>{info.text}</span>
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



