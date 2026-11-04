import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface Customer {
  id: string
  name: string
}

interface LineItem {
  id: string
  itemName: string
  description: string
  quantity: string
  unitPrice: string
  taxOption: string
  customTaxRate: string
}

const TERMS_DAYS: Record<string, number> = {
  "Net 7": 7,
  "Net 15": 15,
  "Net 30": 30,
  "Net 60": 60,
}

const CANADA_TAX_RATES: Record<string, { label: string; rate: number }> = {
  Ontario: { label: "HST 13%", rate: 13 },
  "British Columbia": { label: "GST 5% + PST 7%", rate: 12 },
  Alberta: { label: "GST 5%", rate: 5 },
  Saskatchewan: { label: "GST 5% + PST 6%", rate: 11 },
  Manitoba: { label: "GST 5% + PST 7%", rate: 12 },
  Quebec: { label: "GST 5% + QST 9.975%", rate: 14.975 },
  "Nova Scotia": { label: "HST 15%", rate: 15 },
  "New Brunswick": { label: "HST 15%", rate: 15 },
  "Newfoundland and Labrador": { label: "HST 15%", rate: 15 },
  "Prince Edward Island": { label: "HST 15%", rate: 15 },
  "Northwest Territories": { label: "GST 5%", rate: 5 },
  Yukon: { label: "GST 5%", rate: 5 },
  Nunavut: { label: "GST 5%", rate: 5 },
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function computeDueDate(estimateDate: string, terms: string): string {
  if (!estimateDate) return ""
  const days = TERMS_DAYS[terms]
  if (days === undefined) return estimateDate
  const d = new Date(estimateDate + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function generateNextEstimateNumber(businessId: string): Promise<string> {
  const { data } = await supabase
    .from("estimates")
    .select("estimate_number")
    .eq("business_id", businessId)

  const nums = (data || [])
    .map((r: any) => {
      const match = String(r.estimate_number || "").match(/(\d+)\s*$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n: number) => !isNaN(n))

  const maxNum = nums.length > 0 ? Math.max(...nums) : 0
  const next = maxNum + 1
  return `EST-${String(next).padStart(4, "0")}`
}

function newLineItem(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    taxOption: "none",
    customTaxRate: "0",
  }
}

export default function CreateEstimate() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [businessCountry, setBusinessCountry] = useState<string>("US")
  const [businessProvince, setBusinessProvince] = useState<string | null>(null)
  const [estimateNumber, setEstimateNumber] = useState("EST-0001")
  const [summary, setSummary] = useState("")

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [estimateDate, setEstimateDate] = useState(todayStr())
  const [terms, setTerms] = useState("Net 15")
  const [dueDate, setDueDate] = useState(computeDueDate(todayStr(), "Net 15"))

  const [currency, setCurrency] = useState("USD")
  const [items, setItems] = useState<LineItem[]>([newLineItem()])
  const [notes, setNotes] = useState("")

  const [loadingExisting, setLoadingExisting] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCustomersAndBusiness()
  }, [])

  useEffect(() => {
    if (isEditing) {
      loadExistingEstimate()
    }
  }, [id])

  async function loadCustomersAndBusiness() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!membership) return
    setBusinessId(membership.business_id)

    if (!isEditing) {
      const nextNumber = await generateNextEstimateNumber(membership.business_id)
      setEstimateNumber(nextNumber)
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("name, region, country, logo_url")
      .eq("id", membership.business_id)
      .maybeSingle()

    if (business) {
      setBusinessName(business.name || "")
      setLogoUrl(business.logo_url || null)
      setBusinessCountry(business.country || "US")
      setBusinessProvince(business.region || null)
      if (business.country === "CA" && !isEditing) {
        setCurrency("CAD")
      }
    }

    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", membership.business_id)
      .order("name")

    setCustomers(data || [])
  }

  async function loadExistingEstimate() {
    if (!id) return
    setLoadingExisting(true)
    setError(null)

    const { data: est, error: fetchError } = await supabase
      .from("estimates")
      .select("*, customers(id, name)")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !est) {
      setError(fetchError?.message || "Could not load this estimate for editing. It may not exist, or you may not have access to it.")
      setLoadingExisting(false)
      return
    }

    setEstimateNumber(est.estimate_number)
    setSummary(est.summary || "")
    setEstimateDate(est.estimate_date)
    setTerms(est.payment_terms || "Net 15")
    setDueDate(est.due_date || "")
    setCurrency(est.currency || "USD")
    setNotes(est.notes || "")

    const customerData = Array.isArray(est.customers) ? est.customers[0] : est.customers
    if (customerData) {
      setSelectedCustomer({ id: customerData.id, name: customerData.name })
    }

    const { data: lineItemRows, error: itemsFetchError } = await supabase
      .from("estimate_line_items")
      .select("*")
      .eq("estimate_id", id)
      .order("sort_order")

    if (itemsFetchError) {
      setError(itemsFetchError.message)
    } else if (lineItemRows && lineItemRows.length > 0) {
      const mapped: LineItem[] = lineItemRows.map((row: any) => ({
        id: Math.random().toString(36).slice(2),
        itemName: row.item_name,
        description: row.description || "",
        quantity: String(row.quantity),
        unitPrice: String(row.unit_price),
        taxOption: row.tax_rate > 0 ? "custom" : "none",
        customTaxRate: String(row.tax_rate),
      }))
      setItems(mapped)
    }

    setLoadingExisting(false)
  }

  function handleTermsChange(value: string) {
    setTerms(value)
    setDueDate(computeDueDate(estimateDate, value))
  }

  function handleDateChange(value: string) {
    setEstimateDate(value)
    setDueDate(computeDueDate(value, terms))
  }

  function updateItem(itemId: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, [field]: value } : it))
    )
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  function addItem() {
    setItems((prev) => [...prev, newLineItem()])
  }

  function effectiveTaxRate(it: LineItem): number {
    if (it.taxOption === "none") return 0
    if (it.taxOption === "custom") return parseFloat(it.customTaxRate) || 0
    if (
      businessCountry === "CA" &&
      businessProvince &&
      CANADA_TAX_RATES[businessProvince] &&
      it.taxOption === "province"
    ) {
      return CANADA_TAX_RATES[businessProvince].rate
    }
    return 0
  }

  function lineSubtotal(it: LineItem): number {
    return (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0)
  }

  function lineTax(it: LineItem): number {
    return lineSubtotal(it) * (effectiveTaxRate(it) / 100)
  }

  const subtotal = items.reduce((sum, it) => sum + lineSubtotal(it), 0)
  const taxTotal = items.reduce((sum, it) => sum + lineTax(it), 0)
  const total = subtotal + taxTotal

  const canSubmit =
    !!businessId &&
    !!selectedCustomer &&
    items.some((it) => it.itemName.trim().length > 0) &&
    !saving

  async function handleSaveDraft() {
    if (!canSubmit || !businessId || !selectedCustomer) return
    setSaving(true)
    setError(null)

    if (isEditing && id) {
      const { error: updateError } = await supabase
        .from("estimates")
        .update({
          customer_id: selectedCustomer.id,
          estimate_number: estimateNumber,
          summary: summary.trim() || null,
          estimate_date: estimateDate,
          payment_terms: terms,
          due_date: dueDate || null,
          currency,
          subtotal,
          tax_total: taxTotal,
          total,
          notes: notes.trim() || null,
        })
        .eq("id", id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      await supabase.from("estimate_line_items").delete().eq("estimate_id", id)

      const validItems = items.filter((it) => it.itemName.trim().length > 0)
      const rows = validItems.map((it, index) => ({
        estimate_id: id,
        item_name: it.itemName.trim(),
        description: it.description.trim() || null,
        quantity: parseFloat(it.quantity) || 0,
        unit_price: parseFloat(it.unitPrice) || 0,
        tax_rate: effectiveTaxRate(it),
        line_total: lineSubtotal(it) + lineTax(it),
        sort_order: index,
      }))

      if (rows.length > 0) {
        await supabase.from("estimate_line_items").insert(rows)
      }

      await supabase.from("estimate_activity").insert({
        estimate_id: id,
        action: "Edited",
        detail: "Draft updated",
      })

      setSaving(false)
      navigate(`/estimates/${id}`)
      return
    }

    const { data: estimate, error: estimateError } = await supabase
      .from("estimates")
      .insert({
        business_id: businessId,
        customer_id: selectedCustomer.id,
        estimate_number: estimateNumber,
        summary: summary.trim() || null,
        status: "draft",
        estimate_date: estimateDate,
        payment_terms: terms,
        due_date: dueDate || null,
        currency,
        subtotal,
        tax_total: taxTotal,
        total,
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (estimateError || !estimate) {
      setError(estimateError?.message || "Failed to save estimate.")
      setSaving(false)
      return
    }

    const validItems = items.filter((it) => it.itemName.trim().length > 0)
    const rows = validItems.map((it, index) => ({
      estimate_id: estimate.id,
      item_name: it.itemName.trim(),
      description: it.description.trim() || null,
      quantity: parseFloat(it.quantity) || 0,
      unit_price: parseFloat(it.unitPrice) || 0,
      tax_rate: effectiveTaxRate(it),
      line_total: lineSubtotal(it) + lineTax(it),
      sort_order: index,
    }))

    const { error: itemsError } = await supabase
      .from("estimate_line_items")
      .insert(rows)

    setSaving(false)

    if (itemsError) {
      setError(itemsError.message)
      return
    }

    navigate(`/estimates/${estimate.id}`)
  }

  const filteredCustomers = customerSearch.trim().length === 0
    ? []
    : customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
      )

  const provincePreset =
    businessCountry === "CA" && businessProvince ? CANADA_TAX_RATES[businessProvince] : null
  const countryLabel = businessCountry === "CA" ? "Canada" : "United States"
  const locationLabel = businessProvince ? `${businessProvince}, ${countryLabel}` : countryLabel

  if (loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading estimate...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => (isEditing ? navigate(`/estimates/${id}`) : navigate(-1))}
          className="text-2xl text-gray-500"
        >
          &times;
        </button>
        <h1 className="text-lg font-bold">{isEditing ? "Edit Estimate" : "Create Estimate"}</h1>
        <div className="w-6" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 mb-4">
          {error}
        </div>
      )}

      {logoUrl ? (
        <div className="border border-gray-200 rounded-xl p-3 mb-1">
          <img src={logoUrl} alt="Business logo" className="h-12 max-w-[60%] object-contain" />
        </div>
      ) : (
        <button onClick={() => navigate("/business")} className="w-full border border-dashed border-gray-300 rounded-xl py-4 text-center mb-1">
          <span className="text-blue-700 text-sm font-semibold">+ Add logo</span>
          <p className="text-gray-400 text-xs mt-0.5">Set it once in Business details</p>
        </button>
      )}

      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-900">
          {businessName || "Your business"}
        </p>
        <p className="text-xs text-gray-500 mb-1">{locationLabel}</p>
        <button onClick={() => navigate("/business")} className="text-blue-700 text-xs font-semibold">
          Edit business address and contact details
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded">
            Draft
          </span>
        </div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Estimate number</label>
        <input
          type="text"
          value={estimateNumber}
          onChange={(e) => setEstimateNumber(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
        />
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Summary <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Project name, description, or details"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
        {selectedCustomer && !showCustomerPicker ? (
          <button
            onClick={() => setShowCustomerPicker(true)}
            className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          >
            <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
            <span className="text-blue-700 text-xs font-semibold">Change</span>
          </button>
        ) : (
          <div className="border border-gray-300 rounded-lg p-3">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 mb-2 min-w-0"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredCustomers.length === 0 && (
                <p className="text-xs text-gray-400 px-1 py-2">No customers found.</p>
              )}
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c)
                    setShowCustomerPicker(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button onClick={() => navigate("/customers/new")} className="text-blue-700 text-xs font-semibold mt-2">
              + Add new customer
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-500 mb-1">Estimate date</label>
          <input
            type="date"
            value={estimateDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-500 mb-1">Terms</label>
          <select
            value={terms}
            onChange={(e) => handleTermsChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
          >
            <option>Net 7</option>
            <option>Net 15</option>
            <option>Net 30</option>
            <option>Net 60</option>
            <option>Custom</option>
          </select>
        </div>
      </div>

      <div className="mb-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">Payment due</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
        />
      </div>
      <p className="text-xs text-gray-400 mb-5">Auto-set from Terms — you can override</p>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">ITEMS</p>
      </div>

      {items.map((it) => (
        <div key={it.id} className="border border-gray-200 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={it.itemName}
              onChange={(e) => updateItem(it.id, "itemName", e.target.value)}
              placeholder="Item name"
              className="flex-1 min-w-0 border-b border-gray-200 px-1 py-1 text-sm outline-none focus:border-blue-600"
            />
            <button onClick={() => removeItem(it.id)} className="text-gray-400 text-lg shrink-0 px-1">
              &times;
            </button>
          </div>
          <input
            type="text"
            value={it.description}
            onChange={(e) => updateItem(it.id, "description", e.target.value)}
            placeholder="Description (optional)"
            className="w-full min-w-0 border-b border-gray-100 px-1 py-1 text-xs text-gray-500 outline-none focus:border-blue-600 mb-2"
          />
          <div className="flex gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] text-gray-500 mb-0.5">Qty</label>
              <input
                type="number"
                value={it.quantity}
                onChange={(e) => updateItem(it.id, "quantity", e.target.value)}
                className="w-full min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] text-gray-500 mb-0.5">Price</label>
              <input
                type="number"
                value={it.unitPrice}
                onChange={(e) => updateItem(it.id, "unitPrice", e.target.value)}
                className="w-full min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <label className="block text-[10px] text-gray-500 mb-0.5">Amount</label>
              <p className="text-sm font-semibold pt-1.5">
                ${(lineSubtotal(it) + lineTax(it)).toFixed(2)}
              </p>
            </div>
          </div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Tax</label>
          <select
            value={it.taxOption}
            onChange={(e) => updateItem(it.id, "taxOption", e.target.value)}
            className="w-full min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600 mb-1"
          >
            <option value="none">No tax</option>
            {provincePreset && (
              <option value="province">{provincePreset.label} ({businessProvince})</option>
            )}
            <option value="custom">Custom %</option>
          </select>
          {it.taxOption === "custom" && (
            <input
              type="number"
              value={it.customTaxRate}
              onChange={(e) => updateItem(it.id, "customTaxRate", e.target.value)}
              placeholder="Custom tax rate %"
              className="w-full min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-600"
            />
          )}
        </div>
      ))}

      <button onClick={addItem} className="text-blue-700 text-sm font-semibold mb-5">
        + Add item
      </button>

      <div className="border-t border-gray-200 pt-4 mb-5">
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Tax</span>
          <span>${taxTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-600"
          >
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3">
          <span>Total</span>
          <span>${total.toFixed(2)} {currency}</span>
        </div>
      </div>

      <label className="block text-xs font-medium text-gray-500 mb-1">
        Notes &amp; terms <span className="text-gray-400">(optional)</span>
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes, payment terms, or instructions..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 h-20 resize-none mb-4 min-w-0"
      />

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSaveDraft}
        disabled={!canSubmit}
        className="w-full mb-8 btn-glass btn-glass-primary"
      >
        {saving ? "Saving..." : isEditing ? "Save changes" : "Save draft"}
      </button>
    </div>
  )
}
