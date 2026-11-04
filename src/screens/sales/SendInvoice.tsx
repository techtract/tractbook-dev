import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function SendInvoice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<any>(null)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    if (!id) return
    const { data } = await supabase
      .from("invoices")
      .select("*, customers(name, email)")
      .eq("id", id)
      .maybeSingle()
    if (data) {
      setInvoice(data)
      setCustomerName((data.customers as any)?.name || "")
      setCustomerEmail((data.customers as any)?.email || null)
    }
  }

  function handleDownloadPdf() {
    window.open(`/invoices/${id}/print`, "_blank")
  }

  async function handleEmailCustomer() {
    if (!id || emailing) return
    setEmailing(true)
    setMarkError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setMarkError("You must be signed in to send.")
        return
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ type: "invoice", id }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMarkError(result.error || "The email could not be sent. Please try again.")
        return
      }
      navigate(`/invoices/${id}`)
    } catch {
      setMarkError("The email could not be sent. Check your connection and try again.")
    } finally {
      setEmailing(false)
    }
  }

  function handleLaunchEmail() {
    const subject = encodeURIComponent(`Invoice ${invoice?.invoice_number} from your business`)
    const body = encodeURIComponent(
      `Hi ${customerName},\n\nPlease find your invoice ${invoice?.invoice_number} for $${invoice?.total?.toFixed(2)}.\n\nThanks!`
    )
    window.location.href = `mailto:${customerEmail || ""}?subject=${subject}&body=${body}`
  }

  async function handleMarkSent() {
    if (!id) return
    setMarking(true)
    setMarkError(null)
    const { data: updated, error: updError } = await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
    if (updError || !updated || updated.length === 0) {
      setMarkError(updError?.message || "Could not mark this invoice as sent. Please try again.")
      setMarking(false)
      return
    }
    await supabase.from("invoice_activity").insert({
      invoice_id: id,
      action: "Sent",
      detail: "Marked as sent",
    })
    setMarking(false)
    navigate(`/invoices/${id}`)
  }

  if (!invoice) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 text-sm">Loading...</p></div>
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5">
        <span className="text-lg font-bold">Send Invoice</span>
        <button onClick={() => navigate(`/invoices/${id}`)} className="text-2xl text-gray-500">&times;</button>
      </div>

      <p className="text-xs text-gray-500 mb-4">Choose how you'd like to send this to {customerName || "your customer"}.</p>

      <button
        onClick={handleDownloadPdf}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-lg p-3 mb-2.5 text-left"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-base">&#11015;</span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Download PDF</span>
          <span className="block text-xs text-gray-500">Opens a printable version — use your browser's Print &rarr; Save as PDF</span>
        </span>
      </button>

      <button
        onClick={handleEmailCustomer}
        disabled={!customerEmail || emailing}
        className="w-full flex items-center gap-3 border border-blue-200 bg-blue-50/40 rounded-lg p-3 mb-2.5 text-left disabled:opacity-50"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-base">&#9993;</span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">{emailing ? "Sending..." : "Email to customer"}</span>
          <span className="block text-xs text-gray-500">
            {customerEmail ? `Sends a link to ${customerEmail}. Replies come to you.` : "Add an email to this customer first"}
          </span>
        </span>
      </button>

      <button
        onClick={handleLaunchEmail}
        disabled={!customerEmail}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-lg p-3 mb-2.5 text-left disabled:opacity-50"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-base">&#9993;</span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Open in my email app</span>
          <span className="block text-xs text-gray-500">
            {customerEmail ? "Opens your email app, ready to send" : "Add an email to this customer first"}
          </span>
        </span>
      </button>

      {markError && <p className="text-red-500 text-sm mb-3">{markError}</p>}

      <div className="flex gap-2 mt-auto">
        <button onClick={() => navigate(`/invoices/${id}`)} className="flex-1 btn-glass btn-glass-neutral">
          Cancel
        </button>
        <button onClick={handleMarkSent} disabled={marking} className="flex-1 btn-glass btn-glass-primary">
          {marking ? "Saving..." : "Mark as sent"}
        </button>
      </div>
    </div>
  )
}
