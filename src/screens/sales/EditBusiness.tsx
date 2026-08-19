import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"

const CANADIAN_PROVINCES = [
  "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba",
  "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland and Labrador",
  "Prince Edward Island", "Northwest Territories", "Yukon", "Nunavut",
]

const US_STATES = [
  "California", "Texas", "New York", "Florida", "Illinois", "Other",
]

const LEGAL_STRUCTURES = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation",
  "LLC",
  "Non-Profit",
]

function isValidBN(value: string): boolean {
  const cleaned = value.replace(/\s/g, "").toUpperCase()
  return /^\d{9}$/.test(cleaned) || /^\d{9}[A-Z]{2}\d{4}$/.test(cleaned)
}

function isValidEIN(value: string): boolean {
  return /^\d{2}-?\d{7}$/.test(value.trim())
}

export default function EditBusiness() {
  const navigate = useNavigate()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [legalStructure, setLegalStructure] = useState("")
  const [yearStarted, setYearStarted] = useState("")
  const [country, setCountry] = useState("US")
  const [region, setRegion] = useState("")
  const [businessNumber, setBusinessNumber] = useState("")
  const [taxRegNumber, setTaxRegNumber] = useState("")

  const [street1, setStreet1] = useState("")
  const [street2, setStreet2] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")

  const [mailingSameAsBusiness, setMailingSameAsBusiness] = useState(true)
  const [mailingStreet1, setMailingStreet1] = useState("")
  const [mailingStreet2, setMailingStreet2] = useState("")
  const [mailingCity, setMailingCity] = useState("")
  const [mailingPostalCode, setMailingPostalCode] = useState("")

  const isCanada = country === "CA"
  const bnFormatValid = !businessNumber || (isCanada ? isValidBN(businessNumber) : isValidEIN(businessNumber))

  useEffect(() => {
    loadBusiness()
  }, [])

  async function loadBusiness() {
    setLoading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to edit business details.")
      setLoading(false)
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
      setLoading(false)
      return
    }

    setBusinessId(membership.business_id)

    const { data: business, error: fetchError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", membership.business_id)
      .maybeSingle()

    if (fetchError || !business) {
      setError(fetchError?.message || "Could not load business details.")
      setLoading(false)
      return
    }

    setName(business.name || "")
    setPhone(business.phone || "")
    setLegalStructure(business.legal_structure || "")
    setYearStarted(business.year_started ? String(business.year_started) : "")
    setCountry(business.country || "US")
    setRegion(business.region || "")
    setBusinessNumber(business.business_number || "")
    setTaxRegNumber(business.tax_registration_number || "")
    setStreet1(business.street1 || "")
    setStreet2(business.street2 || "")
    setCity(business.city || "")
    setPostalCode(business.postal_code || "")
    setMailingSameAsBusiness(
      business.mailing_same_as_business === null ? true : business.mailing_same_as_business
    )
    setMailingStreet1(business.mailing_street1 || "")
    setMailingStreet2(business.mailing_street2 || "")
    setMailingCity(business.mailing_city || "")
    setMailingPostalCode(business.mailing_postal_code || "")

    setLoading(false)
  }

  async function handleSave() {
    if (!businessId || !bnFormatValid) return
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        legal_structure: legalStructure || null,
        year_started: yearStarted ? Number(yearStarted) : null,
        country,
        region: region || null,
        business_number: businessNumber.trim() || null,
        tax_registration_number: taxRegNumber.trim() || null,
        street1: street1.trim() || null,
        street2: street2.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        mailing_same_as_business: mailingSameAsBusiness,
        mailing_street1: mailingSameAsBusiness ? null : mailingStreet1.trim() || null,
        mailing_street2: mailingSameAsBusiness ? null : mailingStreet2.trim() || null,
        mailing_city: mailingSameAsBusiness ? null : mailingCity.trim() || null,
        mailing_postal_code: mailingSameAsBusiness ? null : mailingPostalCode.trim() || null,
      })
      .eq("id", businessId)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    navigate(-1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading business details...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="text-2xl text-gray-500">
          &times;
        </button>
        <h1 className="text-lg font-bold">Business details</h1>
        <button
          onClick={handleSave}
          disabled={saving || !bnFormatValid}
          className="text-blue-700 font-semibold text-sm disabled:text-gray-300"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <button className="w-full border border-dashed border-gray-300 rounded-xl py-4 text-center mb-5">
        <span className="text-blue-700 text-sm font-semibold">+ Add logo</span>
        <p className="text-gray-400 text-xs mt-0.5">Max size 1MB</p>
      </button>

      <label className="block text-xs font-medium text-gray-500 mb-1">Business name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      />

      <label className="block text-xs font-medium text-gray-500 mb-1">
        Business phone <span className="text-gray-400">(optional)</span>
      </label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 (555) 123-4567"
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      />

      <label className="block text-xs font-medium text-gray-500 mb-1">Legal structure</label>
      <select
        value={legalStructure}
        onChange={(e) => setLegalStructure(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      >
        <option value="">Select...</option>
        {LEGAL_STRUCTURES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <label className="block text-xs font-medium text-gray-500 mb-1">Year started</label>
      <input
        type="number"
        value={yearStarted}
        onChange={(e) => setYearStarted(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      />

      <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      >
        <option value="US">United States</option>
        <option value="CA">Canada</option>
      </select>

      <label className="block text-xs font-medium text-gray-500 mb-1">
        {isCanada ? "Province" : "State"}
      </label>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      >
        <option value="">Select...</option>
        {(isCanada ? CANADIAN_PROVINCES : US_STATES).map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <label className="block text-xs font-medium text-gray-500 mb-1">
        {isCanada ? "Business Number (BN)" : "EIN"}
      </label>
      <input
        type="text"
        value={businessNumber}
        onChange={(e) => setBusinessNumber(e.target.value)}
        placeholder={isCanada ? "123456789 or 123456789RT0001" : "12-3456789"}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 min-w-0"
      />
      {!bnFormatValid && (
        <p className="text-red-500 text-xs mt-1 mb-2">
          Enter a valid {isCanada ? "Business Number" : "EIN"} format.
        </p>
      )}
      <div className={bnFormatValid ? "mb-3" : "mb-1"} />

      {isCanada && (
        <>
          <label className="block text-xs font-medium text-gray-500 mb-1">HST/GST registration</label>
          <input
            type="text"
            value={taxRegNumber}
            onChange={(e) => setTaxRegNumber(e.target.value)}
            placeholder="123456789RT0001"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
          />
        </>
      )}

      <p className="text-xs font-semibold text-gray-500 mb-2 mt-2">BUSINESS ADDRESS</p>
      <input
        type="text"
        value={street1}
        onChange={(e) => setStreet1(e.target.value)}
        placeholder="Street address 1"
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      />
      <input
        type="text"
        value={street2}
        onChange={(e) => setStreet2(e.target.value)}
        placeholder="Street address 2"
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
      />
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
        />
        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder={isCanada ? "A1A 1A1" : "ZIP code"}
          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <input
          type="checkbox"
          checked={mailingSameAsBusiness}
          onChange={(e) => setMailingSameAsBusiness(e.target.checked)}
        />
        Mailing address same as business address
      </label>

      {!mailingSameAsBusiness && (
        <>
          <p className="text-xs font-semibold text-gray-500 mb-2">MAILING ADDRESS</p>
          <input
            type="text"
            value={mailingStreet1}
            onChange={(e) => setMailingStreet1(e.target.value)}
            placeholder="Street address 1"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
          />
          <input
            type="text"
            value={mailingStreet2}
            onChange={(e) => setMailingStreet2(e.target.value)}
            placeholder="Street address 2"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 mb-3 min-w-0"
          />
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={mailingCity}
              onChange={(e) => setMailingCity(e.target.value)}
              placeholder="City"
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
            />
            <input
              type="text"
              value={mailingPostalCode}
              onChange={(e) => setMailingPostalCode(e.target.value)}
              placeholder={isCanada ? "A1A 1A1" : "ZIP code"}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
        </>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !bnFormatValid}
        className="w-full bg-blue-700 disabled:bg-blue-200 text-white rounded-lg py-3 font-medium mb-8 mt-2"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      </div>
      <BottomNav active="sales" />
    </div>
  )
}
