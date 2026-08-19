import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const METHODS = ["Bank payment", "Cash", "Cheque", "Credit card", "PayPal", "Other"]

export default function ReceivePayment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!id || !amount || saving) return
    setSaving(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from("payments").insert({
      invoice_id: id,
      amount: parseFloat(amount),
      method,
      payment_date: date,
      notes: notes.trim() || null,
      created_by: userData.user?.id,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    await supabase.from("invoice_activity").insert({
      invoice_id: id,
      user_name: userData.user?.email,
      action: "Payment received",
      detail: `$${amount} via ${method}`,
    })

    // If payments now cover the full invoice total, mark it paid.
    const { data: invoiceRow } = await supabase
      .from("invoices")
      .select("total")
      .eq("id", id)
      .maybeSingle()

    if (invoiceRow) {
      const { data: allPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", id)

      const paidTotal = (allPayments || []).reduce((sum, p) => sum + Number(p.amount), 0)

      if (paidTotal >= Number(invoiceRow.total)) {
        await supabase.from("invoices").update({ status: "paid" }).eq("id", id)
      }
    }

    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-8">
          <span className="text-lg font-bold">Receive a payment</span>
          <button onClick={() => navigate(`/invoices/${id}`)} className="text-2xl text-gray-500">&times;</button>
        </div>
        <div className="flex flex-col items-center text-center pt-10">
          <div className="w-16 h-16 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-3xl mb-5">
            &#10003;
          </div>
          <p className="text-lg font-bold mb-6">The payment was recorded</p>
        </div>
        <button onClick={() => navigate(`/invoices/${id}`)} className="w-full bg-blue-700 text-white rounded-lg py-3 font-medium mt-auto">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-5">
        <span className="text-lg font-bold">Receive a payment</span>
        <button onClick={() => navigate(`/invoices/${id}`)} className="text-2xl text-gray-500">&times;</button>
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0" />

      <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
      <div className="relative mb-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0" />
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0 bg-white"
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <label className="block text-xs font-medium text-gray-500 mb-1">Memo / notes <span className="text-gray-400">(optional)</span></label>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-4 min-w-0" />

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex gap-2 mt-auto">
        <button onClick={() => navigate(`/invoices/${id}`)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-3 text-sm font-semibold">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving || !amount} className="flex-1 bg-blue-700 disabled:bg-blue-200 text-white rounded-lg py-3 text-sm font-semibold">
          {saving ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  )
}

