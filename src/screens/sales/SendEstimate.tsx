import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function SendEstimate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState<any>(null)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    if (!id) return
    const { data } = await supabase
      .from("estimates")
      .select("*, customers(name, email)")
      .eq("id", id)
      .maybeSingle()
    if (data) {
      setEstimate(data)
      setCustomerName((data.customers as any)?.name || "")
      setCustomerEmail((data.customers as any)?.email || null)
    }
  }

  function handleDownloadPdf() {
    window.open(`/estimates/${id}/print`, "_blank")
  }

  function handleLaunchEmail() {
    const subject = encodeURIComponent(`Estimate ${estimate?.estimate_number} from your business`)
    const body = encodeURIComponent(
      `Hi ${customerName},\n\nPlease find your estimate ${estimate?.estimate_number} for $${estimate?.total?.toFixed(2)}.\n\nThanks!`
    )
    window.location.href = `mailto:${customerEmail || ""}?subject=${subject}&body=${body}`
  }

  async function handleMarkSent() {
    if (!id) return
    setMarking(true)
    setMarkError(null)
    const { data: updated, error: updError } = await supabase
      .from("estimates")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
    if (updError || !updated || updated.length === 0) {
      setMarkError(updError?.message || "Could not mark this estimate as sent. Please try again.")
      setMarking(false)
      return
    }
    await supabase.from("estimate_activity").insert({
      estimate_id: id,
      action: "Sent",
      detail: "Marked as sent",
    })
    setMarking(false)
    navigate(`/estimates/${id}`)
  }

  if (!estimate) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 text-sm">Loading...</p></div>
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5">
        <span className="text-lg font-bold">Send Estimate</span>
        <button onClick={() => navigate(`/estimates/${id}`)} className="text-2xl text-gray-500">&times;</button>
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
        onClick={handleLaunchEmail}
        disabled={!customerEmail}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-lg p-3 mb-2.5 text-left disabled:opacity-50"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-base">&#9993;</span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Launch email</span>
          <span className="block text-xs text-gray-500">
            {customerEmail ? "Opens your email app, ready to send" : "Add an email to this customer first"}
          </span>
        </span>
      </button>

      <p className="text-[11px] text-gray-400 mb-5">
        A shareable link (no login required for your customer) is coming in the next update.
      </p>

      {markError && <p className="text-red-500 text-sm mb-3">{markError}</p>}

      <div className="flex gap-2 mt-auto">
        <button onClick={() => navigate(`/estimates/${id}`)} className="flex-1 btn-glass btn-glass-neutral">
          Cancel
        </button>
        <button onClick={handleMarkSent} disabled={marking} className="flex-1 btn-glass btn-glass-primary">
          {marking ? "Saving..." : "Mark as sent"}
        </button>
      </div>
    </div>
  )
}
