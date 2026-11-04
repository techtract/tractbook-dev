import { useEffect, useState } from "react"
import { StepCard, StepTitle, UpgradeNote, BackArrow, MoreButton, btnPrimary, btnSoft, btnOutline, btnBig } from "../../components/sales/StepCard"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { invoiceBadge } from "../../lib/documentStatus"

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
  const [actionError, setActionError] = useState<string | null>(null)
  const [markingSent, setMarkingSent] = useState(false)
  const [hasTaxNumber, setHasTaxNumber] = useState(true)
  const [showVoid, setShowVoid] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [voiding, setVoiding] = useState(false)
  const [invoice, setInvoice] = useState<any>(null)
  const [customerName, setCustomerName] = useState("")
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [gettingLink, setGettingLink] = useState(false)
  const [paymentLinkError, setPaymentLinkError] = useState<string | null>(null)

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

    const { data: biz } = await supabase
      .from("businesses")
      .select("country, tax_registration_number")
      .eq("id", inv.business_id)
      .maybeSingle()
    setHasTaxNumber(!biz || biz.country !== "CA" || !!biz.tax_registration_number)
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
    if (!id || markingSent) return
    setMarkingSent(true)
    setActionError(null)
    const { data: updated, error: updError } = await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
    setMarkingSent(false)
    if (updError || !updated || updated.length === 0) {
      setActionError(updError?.message || "Could not mark this invoice as sent. Please try again.")
      return
    }
    await logActivity("Sent", "Marked as sent")
    loadInvoice()
  }

  async function handleVoid() {
    if (!id || voiding) return
    const reason = voidReason.trim()
    if (!reason) {
      setActionError("Add a short reason for voiding this invoice.")
      return
    }
    setVoiding(true)
    setActionError(null)
    const { data: updated, error: updError } = await supabase
      .from("invoices")
      .update({ status: "void", void_reason: reason, voided_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
    setVoiding(false)
    if (updError || !updated || updated.length === 0) {
      setActionError(updError?.message || "Could not void this invoice. Please try again.")
      return
    }
    await logActivity("Voided", reason)
    setShowVoid(false)
    setVoidReason("")
    setShowActions(false)
    loadInvoice()
  }

  async function handleDelete() {
    if (!id || invoice?.status !== "draft") return
    if (payments.length > 0) {
      setActionError("This draft has payments recorded, so it can't be deleted.")
      return
    }
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

  async function handleGetPaymentLink() {
    if (!id) return
    setGettingLink(true)
    setPaymentLinkError(null)

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setPaymentLinkError("You must be signed in.")
      setGettingLink(false)
      return
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice-checkout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice_id: id }),
      }
    )

    const data = await res.json()

    setGettingLink(false)

    if (!res.ok || data.error) {
      setPaymentLinkError(data.error || "Could not create payment link.")
      return
    }

    navigator.clipboard.writeText(data.url).catch(() => {})
    window.open(data.url, "_blank")
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

  const badge = invoiceBadge(invoice.status, invoice.due_date)
  const isDraft = invoice.status === "draft"
  const isPaid = invoice.status === "paid"
  const isVoid = invoice.status === "void"
  const isSent = invoice.status === "sent" || invoice.status === "paid" || !!invoice.sent_at
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const balanceDue = invoice.total - paidTotal

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-4">
        <BackArrow onClick={() => navigate("/invoices")} />
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">Invoice {invoice.invoice_number}</span>
          <span className={`${badge.className} text-[10px] font-bold px-2 py-0.5 rounded uppercase`}>{badge.label}</span>
        </div>
        <MoreButton onClick={() => setShowActions((s) => !s)} />
      </div>

      {showActions && (
        <div className="border border-gray-200 rounded-lg mb-4 divide-y divide-gray-100 text-sm">
          <button onClick={() => navigate(`/invoices/${id}/print`)} className="w-full text-left px-4 py-2.5">Export as PDF / Print</button>
          {isDraft && payments.length === 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-left px-4 py-2.5 text-red-600"
            >
              {deleting ? "Deleting..." : "Delete draft"}
            </button>
          )}
          {!isDraft && !isVoid && (
            <button
              onClick={() => { setShowVoid(true); setShowActions(false); setActionError(null) }}
              className="w-full text-left px-4 py-2.5 text-red-600"
            >
              Void invoice
            </button>
          )}
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

      {showVoid && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Void this invoice?</p>
          {payments.length > 0 ? (
            <p className="text-xs text-red-700 mb-2">
              This invoice has payments recorded, so it can't be voided yet. Refunds and credit notes are coming in an update.
            </p>
          ) : (
            <>
              <p className="text-xs text-red-700 mb-2">
                It stays on record, is left out of your totals, and can't be undone.
              </p>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason (for example: wrong customer)"
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none h-16 resize-none mb-2 min-w-0 bg-white"
              />
            </>
          )}
          {actionError && <p className="text-red-600 text-xs mb-2">{actionError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowVoid(false); setActionError(null) }} className={`${btnSoft} flex-1`}>Cancel</button>
            {payments.length === 0 && (
              <button onClick={handleVoid} disabled={voiding} className="flex-1 rounded-full bg-red-600 text-white text-sm font-semibold py-2.5">
                {voiding ? "Voiding..." : "Void invoice"}
              </button>
            )}
          </div>
        </div>
      )}

      {isVoid && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 mb-4">
          <b>Void.</b> {invoice.void_reason ? `Reason: ${invoice.void_reason}. ` : ""}This invoice is kept on record but is not counted in your totals.
        </div>
      )}

      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 mb-4">
          This is a <b>draft</b> invoice. Send it to your customer to start collecting payment.
        </div>
      )}

      {!isPaid && !isVoid && Number(invoice.tax_total) > 0 && !hasTaxNumber && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 mb-4">
          This invoice charges tax, but your business has no GST/HST number. Add it in Business settings so it prints on the invoice.
        </div>
      )}

      {isPaid && (
        <div className="bg-brand-success-soft border border-brand-success-line rounded-lg px-3 py-2.5 text-xs text-brand-success-dark mb-4">
          This invoice has been paid in full.
        </div>
      )}

      <StepCard>
        <StepTitle kind="create" state="done" title="Create" />
        <p className="text-xs text-body ml-12 mb-2">
          Created {new Date(invoice.created_at).toLocaleDateString()}
        </p>
        {isDraft && (
          <div className="ml-12">
            <button onClick={() => navigate(`/invoices/${id}/edit`)} className={btnOutline}>
              Edit draft
            </button>
          </div>
        )}
      </StepCard>

      <StepCard>
        <StepTitle kind="send" state={isSent ? "done" : "current"} title="Send" />
        <p className="text-xs text-body ml-12 mb-2">
          {invoice.sent_at ? `Last sent: ${new Date(invoice.sent_at).toLocaleDateString()}` : "Last sent: Never"}
        </p>
        <div className="flex gap-2 mt-1">
          {!isSent && !isPaid && !isVoid && (
            <button onClick={handleMarkSent} disabled={markingSent} className={`${btnSoft} flex-1`}>
              {markingSent ? "Saving..." : "Mark as sent"}
            </button>
          )}
          {!isVoid && (
            <button onClick={() => navigate(`/invoices/${id}/send`)} className={`${btnPrimary} flex-1`}>
              Send invoice
            </button>
          )}
        </div>
        {actionError && !showVoid && <p className="text-red-500 text-xs mt-2">{actionError}</p>}
        {!isVoid && <UpgradeNote>Auto-remind every 7 days</UpgradeNote>}
      </StepCard>

      <StepCard>
        <StepTitle kind="payments" state={isPaid ? "done" : "pending"} title="Payments" />
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

      {invoice.status !== "paid" && !isVoid && !isDraft && (
        <div className="mb-3">
          <button
            onClick={handleGetPaymentLink}
            disabled={gettingLink}
            className={`${btnBig} btn-glass-primary`}
          >
            {gettingLink ? "Creating link..." : "Get Stripe payment link"}
          </button>
          {paymentLinkError && (
            <p className="text-red-500 text-xs mt-2">{paymentLinkError}</p>
          )}
        </div>
      )}
      {!isVoid && !isDraft && (
        <button
          onClick={() => navigate(`/invoices/${id}/payment`)}
          disabled={isPaid}
          className={`${btnBig} btn-glass-success mb-6`}
        >
          {isPaid ? "Paid in full" : "Receive payment"}
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


