import { useEffect, useState } from "react"
import { StepCard, StepTitle, UpgradeNote, BackArrow, MoreButton, btnPrimary, btnSoft, btnOutline, btnBig } from "../../components/sales/StepCard"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { generateNextInvoiceNumber } from "./CreateInvoice"
import { useReadOnly } from "../../hooks/useReadOnly"

interface LineItemRow {
  item_name: string
  quantity: number
  unit_price: number
  line_total: number
}

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

interface ConvertedInvoiceRow {
  id: string
  invoice_number: string
}

export default function EstimateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const readOnly = useReadOnly()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<any>(null)
  const [customerName, setCustomerName] = useState("")
  const [lineItems, setLineItems] = useState<LineItemRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [convertedInvoice, setConvertedInvoice] = useState<ConvertedInvoiceRow | null>(null)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    loadEstimate()
  }, [id])

  async function loadEstimate() {
    if (!id) return
    setLoading(true)
    setError(null)

    const { data: est, error: estError } = await supabase
      .from("estimates")
      .select("*, customers(name)")
      .eq("id", id)
      .maybeSingle()

    if (estError || !est) {
      setError(estError?.message || "Estimate not found.")
      setLoading(false)
      return
    }

    setEstimate(est)
    setCustomerName((est.customers as any)?.name || "Unknown customer")

    const { data: items } = await supabase
      .from("estimate_line_items")
      .select("item_name, quantity, unit_price, line_total")
      .eq("estimate_id", id)
      .order("sort_order")

    setLineItems(items || [])

    const { data: activityRows } = await supabase
      .from("estimate_activity")
      .select("id, user_name, action, detail, created_at")
      .eq("estimate_id", id)
      .order("created_at", { ascending: false })

    setActivity(activityRows || [])

    const { data: paymentRows } = await supabase
      .from("payments")
      .select("id, amount, method, payment_date")
      .eq("estimate_id", id)
      .order("payment_date", { ascending: false })

    setPayments(paymentRows || [])

    const { data: convInv } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("converted_from_estimate_id", id)
      .maybeSingle()

    setConvertedInvoice(convInv || null)
    setLoading(false)
  }

  async function logActivity(action: string, detail: string) {
    if (!id) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from("estimate_activity").insert({
      estimate_id: id,
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
    loadEstimate()
  }

  async function handleMarkSent() {
    if (!id) return
    setActionError(null)
    const { data: updated, error: updError } = await supabase
      .from("estimates")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
    if (updError || !updated || updated.length === 0) {
      setActionError(updError?.message || "Could not mark this estimate as sent. Please try again.")
      return
    }
    await logActivity("Sent", "Marked as sent")
    loadEstimate()
  }

  async function handleConvertToInvoice() {
    if (!id || !estimate || converting || convertedInvoice) return
    setConverting(true)
    setError(null)

    // A fresh number, never derived from the estimate number (EST-0008 -> INV-0008 can already exist).
    const invoiceNumber = await generateNextInvoiceNumber(estimate.business_id)

    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .insert({
        business_id: estimate.business_id,
        customer_id: estimate.customer_id,
        invoice_number: invoiceNumber,
        summary: estimate.summary,
        status: "draft",
        invoice_date: new Date().toISOString().slice(0, 10),
        payment_terms: estimate.payment_terms,
        due_date: estimate.due_date,
        currency: estimate.currency,
        subtotal: estimate.subtotal,
        tax_total: estimate.tax_total,
        total: estimate.total,
        notes: estimate.notes,
        converted_from_estimate_id: estimate.id,
      })
      .select()
      .single()

    if (invError || !invoice) {
      setError(invError?.message || "Could not convert to invoice.")
      setConverting(false)
      return
    }

    const rows = lineItems.map((it, index) => ({
      invoice_id: invoice.id,
      item_name: it.item_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      tax_rate: 0,
      line_total: it.line_total,
      sort_order: index,
    }))

    if (rows.length > 0) {
      await supabase.from("invoice_line_items").insert(rows)
    }

    await supabase.from("estimates").update({ status: "converted" }).eq("id", id)
    await logActivity("Converted", `Converted to Invoice ${invoice.invoice_number}`)

    setConverting(false)
    navigate(`/invoices/${invoice.id}`)
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm("Delete this estimate? This cannot be undone.")) return
    setDeleting(true)
    const { error: delError } = await supabase.from("estimates").delete().eq("id", id)
    setDeleting(false)
    if (delError) {
      setError(delError.message)
      return
    }
    navigate("/estimates")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading estimate...</p>
      </div>
    )
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-red-500 text-sm">{error || "Estimate not found."}</p>
      </div>
    )
  }

  const isConverted = !!convertedInvoice
  const isDraft = estimate.status === "draft"
  const isSent = estimate.status === "sent" || !!estimate.sent_at

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-4">
        <BackArrow onClick={() => navigate("/estimates")} />
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">Estimate {estimate.estimate_number}</span>
          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{isConverted ? "converted" : estimate.status}</span>
        </div>
        <MoreButton onClick={() => setShowActions((s) => !s)} />
      </div>

      {showActions && (
        <div className="border border-gray-200 rounded-lg mb-4 divide-y divide-gray-100 text-sm">
          <button onClick={() => window.open(`/estimates/${id}/print`, "_blank")} className="w-full text-left px-4 py-2.5">Export as PDF / Print</button>
          {!readOnly && <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full text-left px-4 py-2.5 text-red-600"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>}
        </div>
      )}

      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Amount</p>
          <p className="text-2xl font-bold text-gray-900">${estimate.total.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Customer</p>
          <p className="text-sm font-semibold text-gray-900">{customerName}</p>
        </div>
      </div>

      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 mb-4">
          This is a <b>draft</b> estimate. You can take further action once you send it.
        </div>
      )}

      {isConverted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700 mb-4">
          This estimate has been converted to <b>Invoice {convertedInvoice?.invoice_number}</b> and can no longer be edited or converted again.
        </div>
      )}

      <StepCard>
        <StepTitle kind="create" state="done" title="Create" />
        <p className="text-xs text-body ml-12 mb-2">
          Created {new Date(estimate.created_at).toLocaleDateString()}
        </p>
        {!isConverted && !readOnly && (
          <div className="ml-12">
            <button onClick={() => navigate(`/estimates/${id}/edit`)} className={btnOutline}>
              Edit draft
            </button>
          </div>
        )}
      </StepCard>

      <StepCard>
        <StepTitle kind="send" state={isSent ? "done" : "current"} title="Send" />
        <p className="text-xs text-body ml-12 mb-2">
          {estimate.sent_at ? `Last sent: ${new Date(estimate.sent_at).toLocaleDateString()}` : "Last sent: Never"}
        </p>
        {!readOnly && <div className="flex gap-2 mt-1">
          <button onClick={handleMarkSent} className={`${btnSoft} flex-1`}>
            Mark as sent
          </button>
          <button onClick={() => navigate(`/estimates/${id}/send`)} className={`${btnPrimary} flex-1`}>
            Send estimate
          </button>
        </div>}
        {actionError && <p className="text-red-500 text-xs mt-2">{actionError}</p>}
        {!readOnly && <UpgradeNote>Auto-remind every 7 days</UpgradeNote>}
      </StepCard>

      <StepCard>
        <StepTitle
          kind="payments"
          state={payments.length > 0 ? "done" : "pending"}
          title="Payments"
          action={
            readOnly ? undefined : (
              <button onClick={() => navigate(`/estimates/${id}/payment`)} className={btnOutline}>
                Record payment
              </button>
            )
          }
        />
        {payments.length === 0 ? (
          <p className="text-xs text-body ml-12">No payments recorded yet.</p>
        ) : (
          <div className="ml-12 space-y-1">
            {payments.map((p) => (
              <div key={p.id} className="text-xs text-body flex justify-between">
                <span>{p.method} &middot; {p.payment_date}</span>
                <span className="font-semibold text-ink">${p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </StepCard>

      {isConverted ? (
        <div className="w-full bg-blue-50 border border-blue-200 text-blue-700 rounded-lg py-3 font-medium mb-6 text-center text-sm">
          Converted to Invoice {convertedInvoice?.invoice_number}
        </div>
      ) : readOnly ? null : (
        <button
          onClick={handleConvertToInvoice}
          disabled={converting}
          className={`${btnBig} btn-glass-success mb-6`}
        >
          {converting ? "Converting..." : "Convert to Invoice"}
        </button>
      )}

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
              className="btn-glass btn-glass-primary btn-glass-sm"
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

