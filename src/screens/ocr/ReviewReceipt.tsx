import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface LineItem {
  item_name: string
  quantity: number
  unit_price: number
  line_total: number
}

const CATEGORY_OPTIONS = [
  "Software",
  "Office supplies",
  "Travel",
  "Utilities",
  "Payroll",
  "Repairs & maintenance",
  "Other",
]

export default function ReviewReceipt() {
  const location = useLocation()
  const navigate = useNavigate()

  const state = (location.state as { storagePath?: string; extracted?: any }) || {}
  const { storagePath, extracted } = state

  const [vendorName, setVendorName] = useState(extracted?.vendor_name || "")
  const [documentDate, setDocumentDate] = useState(extracted?.document_date || "")
  const [category, setCategory] = useState<string>(extracted?.category || "Other")
  const [paymentStatus, setPaymentStatus] = useState<string>(extracted?.payment_status === "paid" ? "paid" : "unpaid")
  const [subtotal, setSubtotal] = useState<number>(extracted?.subtotal || 0)
  const [taxTotal, setTaxTotal] = useState<number>(extracted?.tax_total || 0)
  const [total, setTotal] = useState<number>(extracted?.total || 0)
  const [lineItems, setLineItems] = useState<LineItem[]>(extracted?.line_items || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confidenceScore = extracted?.confidence_score ?? null
  const isFlagged = extracted?.is_flagged || false
  const flagReason = extracted?.flag_reason || null

  if (!storagePath) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 text-sm mb-4">No document to review. Start a new scan.</p>
        <button onClick={() => navigate("/ocr/scan")} className="text-blue-700 text-sm font-semibold">
          Scan a receipt
        </button>
      </div>
    )
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              [field]: field === "item_name" ? value : parseFloat(value) || 0,
            }
          : it
      )
    )
  }

  async function findOrCreateVendor(businessId: string, name: string): Promise<string | null> {
    if (!name.trim()) return null

    const { data: existing } = await supabase
      .from("vendors")
      .select("id")
      .eq("business_id", businessId)
      .ilike("name", name.trim())
      .maybeSingle()

    if (existing) return existing.id

    const { data: created, error: createError } = await supabase
      .from("vendors")
      .insert({ business_id: businessId, name: name.trim() })
      .select()
      .single()

    if (createError || !created) return null
    return created.id
  }

  async function findOrCreateCategory(businessId: string, name: string): Promise<string | null> {
    if (!name.trim()) return null

    const { data: existing } = await supabase
      .from("expense_categories")
      .select("id")
      .eq("business_id", businessId)
      .ilike("name", name.trim())
      .maybeSingle()

    if (existing) return existing.id

    const { data: created, error: createError } = await supabase
      .from("expense_categories")
      .insert({ business_id: businessId, name: name.trim() })
      .select()
      .single()

    if (createError || !created) return null
    return created.id
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to save this.")
      setSaving(false)
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
      setSaving(false)
      return
    }

    const vendorId = await findOrCreateVendor(membership.business_id, vendorName)
    const categoryId = await findOrCreateCategory(membership.business_id, category)

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        business_id: membership.business_id,
        vendor_id: vendorId,
        vendor_name: vendorName.trim() || null,
        category_id: categoryId,
        document_date: documentDate || null,
        subtotal,
        tax_total: taxTotal,
        total,
        currency: "USD",
        payment_status: paymentStatus,
        confidence_score: confidenceScore,
        is_flagged: isFlagged,
        flag_reason: flagReason,
        bill_to_name: extracted?.bill_to_name || null,
        bill_to_address: extracted?.bill_to_address || null,
        receipt_image_url: storagePath,
        created_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (expenseError || !expense) {
      setError(expenseError?.message || "Could not save this expense.")
      setSaving(false)
      return
    }

    const validItems = lineItems.filter((it) => it.item_name.trim().length > 0)
    if (validItems.length > 0) {
      const rows = validItems.map((it, index) => ({
        expense_id: expense.id,
        item_name: it.item_name.trim(),
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
        line_total: it.line_total || 0,
        sort_order: index,
      }))
      await supabase.from("expense_line_items").insert(rows)
    }

    await supabase.from("expense_activity").insert({
      expense_id: expense.id,
      user_name: userData.user.email || "Someone",
      action: "Scanned",
      detail: extracted ? "Uploaded and reviewed" : "Uploaded, entered manually",
    })

    setSaving(false)
    navigate("/ocr")
  }

  function handleDiscard() {
    navigate("/ocr")
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleDiscard} className="text-2xl text-gray-500">&#8592;</button>
        <span className="font-bold text-gray-900 text-sm">Review receipt</span>
        <button onClick={handleSave} disabled={saving} className="text-blue-700 font-semibold text-sm disabled:text-gray-300">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {(confidenceScore !== null || isFlagged) && (
        <div className="flex gap-2 mb-3">
          {confidenceScore !== null && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
              {Math.round(confidenceScore)}% confidence
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {paymentStatus === "paid" ? "Paid" : "Unpaid"}
          </span>
        </div>
      )}

      {isFlagged && flagReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 mb-4">
          <b>&#9888;&#65039; Flagged:</b> {flagReason}
        </div>
      )}

      {!extracted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 mb-4">
          We couldn't read this document automatically. Please fill in the details below.
        </div>
      )}

      {(extracted?.bill_to_name || extracted?.bill_to_address) && (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 mb-3">
          <p className="font-semibold text-gray-500 mb-0.5">Billed to</p>
          {extracted?.bill_to_name && <p>{extracted.bill_to_name}</p>}
          {extracted?.bill_to_address && <p className="whitespace-pre-line">{extracted.bill_to_address}</p>}
        </div>
      )}

      <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
      <input
        type="text"
        value={vendorName}
        onChange={(e) => setVendorName(e.target.value)}
        placeholder="Vendor name"
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      />

      <div className="flex gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">Payment status</label>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPaymentStatus("unpaid")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${paymentStatus === "unpaid" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600"}`}
        >
          Unpaid
        </button>
        <button
          onClick={() => setPaymentStatus("paid")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${paymentStatus === "paid" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600"}`}
        >
          Paid
        </button>
      </div>

      {lineItems.length > 0 && (
        <>
          <label className="block text-xs font-medium text-gray-500 mb-2">Line items</label>
          {lineItems.map((it, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2">
              <input
                type="text"
                value={it.item_name}
                onChange={(e) => updateLineItem(i, "item_name", e.target.value)}
                className="w-full border-b border-gray-200 pb-1 text-sm outline-none focus:border-blue-600 mb-2"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={it.quantity}
                  onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600 min-w-0"
                />
                <input
                  type="number"
                  value={it.unit_price}
                  onChange={(e) => updateLineItem(i, "unit_price", e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600 min-w-0"
                />
                <input
                  type="number"
                  value={it.line_total}
                  onChange={(e) => updateLineItem(i, "line_total", e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600 min-w-0"
                />
              </div>
            </div>
          ))}
        </>
      )}

      <div className="border-t border-gray-200 pt-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-600">Subtotal</span>
          <input
            type="number"
            value={subtotal}
            onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
            className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right outline-none focus:border-blue-600"
          />
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-600">Tax</span>
          <input
            type="number"
            value={taxTotal}
            onChange={(e) => setTaxTotal(parseFloat(e.target.value) || 0)}
            className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right outline-none focus:border-blue-600"
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Total</span>
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
            className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-bold text-right outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-600 disabled:bg-green-300 text-white rounded-lg py-3 font-medium mb-2"
      >
        {saving ? "Saving..." : "Save expense"}
      </button>
      <button onClick={handleDiscard} className="w-full text-gray-500 text-sm font-semibold py-2 mb-6">
        Discard
      </button>
    </div>
  )
}

