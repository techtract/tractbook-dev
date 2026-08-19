import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface ActivityRow {
  id: string
  user_name: string | null
  action: string
  detail: string | null
  created_at: string
}

interface PaymentRow {
  id: string
  amount: number
  method: string
  payment_date: string
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<any>(null)
  const [customerName, setCustomerName] = useState("")
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [id])

  async function loadInvoice() {
    if (!id) return
    setLoading(true)
    setError(null)

    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("*, customers(name)")
      .eq("id", id)
      .maybeSingle()

    if (invError || !inv) {
      setError(invError?.message || "Invoice not found.")
      setLoading(false)
      return
    }

    setInvoice(inv)
    setCustomerName((inv.customers as any)?.name || "Unknown customer")

    const { data: activityRows } = await supabase
      .from("invoice_activity")
      .select("id, user_name, action, detail, created_at")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false })

    setActivity(activityRows || [])

    const { data: paymentRows } = await supabase
      .from("payments")
      .select("id, amount, method, payment_date")
      .eq("invoice_id", id)
      .order("payment_date", { ascending: false })

    setPayments(paymentRows || [])
    setLoading(false)
  }

  async function logActivity(action: string, detail: string) {
    if (!id) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from("invoice_activity").insert({
      invoice_id: id,
      user_name: userData.user?.email || "Someone",
      action,
      detail,
    })
  }

  async function handleAddNote() {
    if (!noteText.trim() || !id) return
    setSavingNote(true)
    await logActivity("Note", noteText.trim())
    setNoteText("")
    setShowNoteInput(false)
    setSavingNote(false)
    loadInvoice()
  }

  async function handleMarkSent() {
    if (!id) return
    await supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id)
    await logActivity("Sent", "Marked as sent")
    loadInvoice()
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm("Delete this invoice? This cannot be undone.")) return
    setDeleting(true)
    const { error: delError } = await supabase.from("invoices").delete().eq("id", id)
    setDeleting(false)
    if (delError) {
      setError(delError.message)
      return
    }
    navigate("/invoices")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading invoice...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-red-500 text-sm">{error || "Invoice not found."}</p>
      </div>
    )
  }

  const isDraft = invoice.status === "draft"
  const isPaid = invoice.status === "paid"
  const isSent = invoice.status === "sent" || invoice.status === "paid" || !!invoice.sent_at
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const balanceDue = invoice.total - paidTotal

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/invoices")} className="text-2xl text-gray-500">&#8592;</button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">Invoice {invoice.invoice_number}</span>
          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{invoice.status}</span>
        </div>
        <button onClick={() => setShowActions((s) => !s)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-lg font-bold flex items-center justify-center">
          &#8942;
        </button>
      </div>

      {showActions && (
        <div className="border border-gray-200 rounded-lg mb-4 divide-y divide-gray-100 text-sm">
          <button onClick={() => navigate(`/invoices/${id}/print`)} className="w-full text-left px-4 py-2.5">Export as PDF / Print</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full text-left px-4 py-2.5 text-red-600"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}

      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Amount due</p>
          <p className="text-2xl font-bold text-gray-900">${balanceDue.toFixed(2)}</p>
          {paidTotal > 0 && (
            <p className="text-[11px] text-gray-400">of ${invoice.total.toFixed(2)} total</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Customer</p>
          <p className="text-sm font-semibold text-gray-900">{customerName}</p>
        </div>
      </div>

      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 mb-4">
          This is a <b>draft</b> invoice. Send it to your customer to start collecting payment.
        </div>
      )}

      {isPaid && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-xs text-green-700 mb-4">
          &#9989; This invoice has been paid in full.
        </div>
      )}

      <div className="border border-gray-200 rounded-xl p-3.5 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">&#10003;</div>
          <span className="text-sm font-bold text-gray-900">Create</span>
        </div>
        <p className="text-xs text-gray-500 ml-9 mb-2">
          Created {new Date(invoice.created_at).toLocaleDateString()}
        </p>
        <div className="ml-9">
          <button
            onClick={() => navigate(`/invoices/${id}/edit`)}
            className="text-xs font-semibold text-blue-700 border border-blue-700 rounded-lg px-3 py-1.5"
          >
            Edit draft
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-3.5 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isSent ? "bg-green-600 text-white" : "border-2 border-blue-600 text-blue-600"}`}>
            {isSent ? "\u2713" : "\u25B6"}
          </div>
          <span className="text-sm font-bold text-gray-900">Send</span>
        </div>
        <p className="text-xs text-gray-500 ml-9 mb-2">
          {invoice.sent_at ? `Last sent: ${new Date(invoice.sent_at).toLocaleDateString()}` : "Last sent: Never"}
        </p>
        <div className="ml-9 flex gap-2 mb-2">
          <button onClick={handleMarkSent} className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg px-3 py-1.5">
            Mark as sent
          </button>
          <button onClick={() => navigate(`/invoices/${id}/send`)} className="text-xs font-semibold text-white bg-blue-700 rounded-lg px-3 py-1.5">
            Send invoice
          </button>
        </div>
        <div className="ml-9 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-pink-800">
          <span>&#128274; Auto-remind every 7 days</span>
          <span className="bg-pink-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">Upgrade</span>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-3.5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isPaid ? "bg-green-600 text-white" : "border-2 border-gray-300 text-gray-400"}`}>
              {isPaid ? "\u2713" : "\u25CF"}
            </div>
            <span className="text-sm font-bold text-gray-900">Payments</span>
          </div>
        </div>
        {payments.length === 0 ? (
          <p className="text-xs text-gray-500 ml-9">No payments recorded yet.</p>
        ) : (
          <div className="ml-9 space-y-1">
            {payments.map((p) => (
              <div key={p.id} className="text-xs text-gray-700 flex justify-between">
                <span>{p.method} &middot; {p.payment_date}</span>
                <span className="font-semibold">${p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/invoices/${id}/payment`)}
        disabled={isPaid}
        className="w-full bg-green-600 disabled:bg-green-300 text-white rounded-lg py-3 font-medium mb-6"
      >
        {isPaid ? "Paid in full" : "Receive payment"}
      </button>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-900">History and notes</span>
          <button onClick={() => setShowNoteInput((s) => !s)} className="text-xs font-semibold text-blue-700">
            + Add note
          </button>
        </div>

        {showNoteInput && (
          <div className="mb-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 h-16 resize-none mb-2 min-w-0"
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="text-xs font-semibold bg-blue-700 disabled:bg-blue-200 text-white rounded-lg px-3 py-1.5"
            >
              {savingNote ? "Saving..." : "Save note"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {activity.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-[11px] text-gray-500 mb-0.5">
                {new Date(a.created_at).toLocaleString()} &middot; {a.user_name}
              </p>
              <p className="text-xs text-gray-700">
                <b>{a.action}</b>{a.detail ? ` — ${a.detail}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 opacity-55">
        <span className="text-xs font-semibold text-gray-700">Send as an eInvoice</span>
        <div className="w-9 h-5 rounded-full bg-gray-300 relative">
          <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5" />
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 mb-8">
        Structured e-invoicing isn't available for your region yet.
      </p>
    </div>
  )
}
