import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type Section = "contact" | "billing" | "shipping" | null
const COUNTRY_CODES = ["+1", "+91", "+44", "+61"]

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState("")
  const [nameTouched, setNameTouched] = useState(false)
  const [expanded, setExpanded] = useState<Section>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("Mr.")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1")
  const [phone, setPhone] = useState("")
  const [mobileCountryCode, setMobileCountryCode] = useState("+1")
  const [mobileNumber, setMobileNumber] = useState("")
  const [fax, setFax] = useState("")
  const [website, setWebsite] = useState("")
  const [chequeName, setChequeName] = useState("")
  const [notes, setNotes] = useState("")

  const [currency, setCurrency] = useState("USD")
  const [billingStreet1, setBillingStreet1] = useState("")
  const [billingStreet2, setBillingStreet2] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingProvince, setBillingProvince] = useState("")
  const [billingPostal, setBillingPostal] = useState("")

  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true)
  const [shippingStreet1, setShippingStreet1] = useState("")
  const [shippingStreet2, setShippingStreet2] = useState("")
  const [shippingCity, setShippingCity] = useState("")
  const [shippingProvince, setShippingProvince] = useState("")
  const [shippingPostal, setShippingPostal] = useState("")

  const canSubmit = name.trim().length > 0 && !saving

  useEffect(() => {
    loadCustomer()
  }, [id])

  useEffect(() => {
    if (!loaded || nameTouched) return
    const personName = [firstName, lastName].filter(Boolean).join(" ").trim()
    const suggested = personName ? personName : companyName.trim()
    if (suggested) setName(suggested)
  }, [firstName, lastName, companyName, nameTouched, loaded])

  async function loadCustomer() {
    if (!id) return
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !data) {
      setError(fetchError?.message || "Customer not found.")
      setLoading(false)
      return
    }

    const personName = [data.title, data.first_name, data.last_name].filter(Boolean).join(" ").trim()
    const computedName = personName || (data.company_name || "").trim() || data.name || ""
    setName(computedName)
    setTitle(data.title || "Mr.")
    setFirstName(data.first_name || "")
    setLastName(data.last_name || "")
    setCompanyName(data.company_name || "")
    setEmail(data.email || "")
    setPhoneCountryCode(data.phone_country_code || "+1")
    setPhone(data.phone || "")
    setMobileCountryCode(data.mobile_country_code || "+1")
    setMobileNumber(data.mobile_number || "")
    setFax(data.fax || "")
    setWebsite(data.website || "")
    setChequeName(data.cheque_name || "")
    setNotes(data.notes || "")
    setCurrency(data.currency || "USD")

    if (data.billing_address) {
      const b = data.billing_address as any
      setBillingStreet1(b.street1 || "")
      setBillingStreet2(b.street2 || "")
      setBillingCity(b.city || "")
      setBillingProvince(b.province || "")
      setBillingPostal(b.postal_code || "")
    }

    setShippingSameAsBilling(data.shipping_same_as_billing !== false)
    if (data.shipping_address) {
      const s = data.shipping_address as any
      setShippingStreet1(s.street1 || "")
      setShippingStreet2(s.street2 || "")
      setShippingCity(s.city || "")
      setShippingProvince(s.province || "")
      setShippingPostal(s.postal_code || "")
    }

    setLoading(false)
    setLoaded(true)
  }

  function toggleSection(section: Section) {
    setExpanded((prev) => (prev === section ? null : section))
  }

  async function handleSave() {
    if (!canSubmit || !id) return
    setSaving(true)
    setError(null)

    const billingAddress = billingStreet1
      ? {
          street1: billingStreet1,
          street2: billingStreet2,
          city: billingCity,
          province: billingProvince,
          postal_code: billingPostal,
        }
      : null

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        name: name.trim(),
        title: title || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        company_name: companyName.trim() || null,
        email: email.trim() || null,
        phone_country_code: phoneCountryCode,
        phone: phone.trim() || null,
        mobile_country_code: mobileCountryCode,
        mobile_number: mobileNumber.trim() || null,
        fax: fax.trim() || null,
        website: website.trim() || null,
        cheque_name: chequeName.trim() || null,
        notes: notes.trim() || null,
        currency,
        billing_address: billingAddress,
        shipping_address: shippingSameAsBilling
          ? null
          : shippingStreet1
          ? {
              street1: shippingStreet1,
              street2: shippingStreet2,
              city: shippingCity,
              province: shippingProvince,
              postal_code: shippingPostal,
            }
          : null,
        shipping_same_as_billing: shippingSameAsBilling,
      })
      .eq("id", id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    navigate("/customers")
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase.from("customers").delete().eq("id", id)
    setDeleting(false)

    if (deleteError) {
      if (deleteError.message.toLowerCase().includes("foreign key") || deleteError.code === "23503") {
        setError(
          `Can't delete ${name} — they have estimates or invoices linked. Remove those first, or we can add an "archive" option instead if you'd rather keep the history.`
        )
      } else {
        setError(deleteError.message)
      }
      return
    }

    navigate("/customers")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading customer...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/customers")} className="text-2xl text-gray-500">
          &times;
        </button>
        <h1 className="text-lg font-bold">Customer details</h1>
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="text-blue-700 font-semibold text-sm disabled:text-gray-300"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <label className="block text-sm font-medium mb-1">Customer</label>
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setNameTouched(true)
        }}
        placeholder="Person or company name"
        maxLength={150}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600 mb-1"
      />
      <p className="text-right text-xs text-gray-400 mb-6">{name.length}/150</p>

      <p className="text-xs font-semibold text-gray-500 mb-2">
        ADDITIONAL INFO <span className="font-normal text-gray-400">(optional)</span>
      </p>

      <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 mb-6">
        <button
          onClick={() => toggleSection("contact")}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-medium">Contact info and notes</p>
            <p className="text-xs text-gray-500">Easily contact your customer</p>
          </div>
          <span className="text-blue-700 text-sm font-semibold shrink-0 ml-2">
            {expanded === "contact" ? "Close" : "Add"}
          </span>
        </button>
        {expanded === "contact" && (
          <div className="px-4 pt-3 pb-4 space-y-3">
            <div className="flex gap-2">
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-20 min-w-0 border border-gray-300 rounded-lg px-2 py-2.5 text-sm outline-none focus:border-blue-600"
              >
                <option>Mr.</option>
                <option>Ms.</option>
                <option>Mx.</option>
                <option>Dr.</option>
              </select>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
              />
            </div>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <div className="flex gap-2">
              <select
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                className="w-20 min-w-0 border border-gray-300 rounded-lg px-2 py-2.5 text-sm outline-none focus:border-blue-600"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={mobileCountryCode}
                onChange={(e) => setMobileCountryCode(e.target.value)}
                className="w-20 min-w-0 border border-gray-300 rounded-lg px-2 py-2.5 text-sm outline-none focus:border-blue-600"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="Mobile number"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
              />
            </div>
            <input
              type="tel"
              value={fax}
              onChange={(e) => setFax(e.target.value)}
              placeholder="Fax"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <input
              type="text"
              value={chequeName}
              onChange={(e) => setChequeName(e.target.value)}
              placeholder="Name to print on cheques"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 h-20 resize-none min-w-0"
            />
          </div>
        )}

        <button
          onClick={() => toggleSection("billing")}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-medium">Billing info and currency</p>
            <p className="text-xs text-gray-500">For your records and invoices</p>
          </div>
          <span className="text-blue-700 text-sm font-semibold shrink-0 ml-2">
            {expanded === "billing" ? "Close" : "Add"}
          </span>
        </button>
        {expanded === "billing" && (
          <div className="px-4 pt-3 pb-4 space-y-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            >
              <option value="USD">USD ($) - U.S. dollar</option>
              <option value="CAD">CAD ($) - Canadian dollar</option>
            </select>
            <input
              type="text"
              value={billingStreet1}
              onChange={(e) => setBillingStreet1(e.target.value)}
              placeholder="Street address 1"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <input
              type="text"
              value={billingStreet2}
              onChange={(e) => setBillingStreet2(e.target.value)}
              placeholder="Street address 2"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="City"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
              />
              <input
                type="text"
                value={billingProvince}
                onChange={(e) => setBillingProvince(e.target.value)}
                placeholder="Province"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
              />
            </div>
            <input
              type="text"
              value={billingPostal}
              onChange={(e) => setBillingPostal(e.target.value)}
              placeholder="Postal code (e.g. A1A 1A1)"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
            />
          </div>
        )}

        <button
          onClick={() => toggleSection("shipping")}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-medium">Shipping info</p>
            <p className="text-xs text-gray-500">For your records and invoices</p>
          </div>
          <span className="text-blue-700 text-sm font-semibold shrink-0 ml-2">
            {expanded === "shipping" ? "Close" : "Add"}
          </span>
        </button>
        {expanded === "shipping" && (
          <div className="px-4 pt-3 pb-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={shippingSameAsBilling}
                onChange={(e) => setShippingSameAsBilling(e.target.checked)}
              />
              Same as billing address
            </label>
            {!shippingSameAsBilling && (
              <>
                <input
                  type="text"
                  value={shippingStreet1}
                  onChange={(e) => setShippingStreet1(e.target.value)}
                  placeholder="Street address 1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
                />
                <input
                  type="text"
                  value={shippingStreet2}
                  onChange={(e) => setShippingStreet2(e.target.value)}
                  placeholder="Street address 2"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="City"
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={shippingProvince}
                    onChange={(e) => setShippingProvince(e.target.value)}
                    placeholder="Province"
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <input
                  type="text"
                  value={shippingPostal}
                  onChange={(e) => setShippingPostal(e.target.value)}
                  placeholder="Postal code (e.g. A1A 1A1)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
                />
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!canSubmit}
        className="w-full mb-3 btn-glass btn-glass-primary"
      >
        {saving ? "Saving..." : "Save"}
      </button>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full text-red-600 text-sm font-semibold py-2"
      >
        {deleting ? "Deleting..." : "Delete customer"}
      </button>
    </div>
  )
}





