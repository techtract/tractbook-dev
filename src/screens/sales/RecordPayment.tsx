import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { balanceDueCents, money, validatePaymentAmount } from "../../lib/payments"

const METHODS = ["Bank payment", "Cash", "Cheque", "Credit card", "PayPal", "Other"]

export default function RecordPayment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [balance, setBalance] = useState<number | null>(null) // cents

  // What is still uncovered on this estimate, read fresh from the database.
  async function loadBalance(): Promise<number | null> {
    if (!id) return null
    const { data: est } = await supabase.from("estimates").select("total").eq("id", id).maybeSingle()
    if (!est) return null
    const { data: pays } = await supabase.from("payments").select("amount").eq("estimate_id", id)
    return balanceDueCents(Number(est.total), (pays || []).map((p) => Number(p.amount)))
  }

  useEffect(() => {
    loadBalance().then(setBalance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const amountError = validatePaymentAmount(amount, balance, "estimate")

  async function handleSubmit() {
    if (!id || !amount || saving || amountError) return
    setSaving(true)
    setError(null)

    const freshBalance = await loadBalance()
    if (freshBalance === null) {
      setError("Could not load this estimate. Please try again.")
      setSaving(false)
      return
    }
    setBalance(freshBalance)
    const freshError = validatePaymentAmount(amount, freshBalance, "estimate")
    if (freshError) {
      setError(freshError)
      setSaving(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from("payments").insert({
      estimate_id: id,
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

    await supabase.from("estimate_activity").insert({
      estimate_id: id,
      user_name: userData.user?.email,
      action: "Payment recorded",
      detail: `$${amount} via ${method}`,
    })

    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-8">
          <span className="text-lg font-bold">Record a payment</span>
          <button onClick={() => navigate(`/estimates/${id}`)} className="text-2xl text-gray-500">&times;</button>
        </div>
        <div className="flex flex-col items-center text-center pt-10">
          <div className="w-16 h-16 rounded-full border-2 border-brand-success text-brand-success-dark flex items-center justify-center text-3xl mb-5">
            &#10003;
          </div>
          <p className="text-lg font-bold mb-6">The payment was recorded</p>
        </div>
        <button onClick={() => navigate(`/estimates/${id}`)} className="w-full mt-auto btn-glass btn-glass-primary">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-5">
        <span className="text-lg font-bold">Record a payment</span>
        <button onClick={() => navigate(`/estimates/${id}`)} className="text-2xl text-gray-500">&times;</button>
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0" />

      <label className="block text-xs font-medium text-gray-500 mb-1">
        Amount{balance !== null && <span className="text-gray-400"> · Still to pay ${money(balance)}</span>}
      </label>
      <div className="relative mb-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0" />
      </div>
      <p className="text-red-500 text-xs mb-3 min-h-4">{amountError}</p>

      <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
      <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
        {METHODS.map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0 ${
              method === m ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">Memo / notes <span className="text-gray-400">(optional)</span></label>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-4 min-w-0" />

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex gap-2 mt-auto">
        <button onClick={() => navigate(`/estimates/${id}`)} className="flex-1 btn-glass btn-glass-neutral">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving || !amount || !!amountError} className="flex-1 btn-glass btn-glass-primary">
          {saving ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  )
}

