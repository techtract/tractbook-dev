import { useNavigate } from "react-router-dom"
import StepProgress from "./StepProgress"
import SelectField from "../../components/ui/SelectField"
import { useOnboardingDraft } from "../../hooks/useOnboardingDraft"
import { DEFAULT_COUNTRY, isValidYear } from "../../lib/onboardingDraft"

const TITLES = ["Mr.", "Ms.", "Mx.", "Dr."]
const LEGAL_STRUCTURES = ["Sole Proprietorship", "Partnership", "Corporation", "LLC", "Non-Profit"]
const COUNTRIES = [
  { value: "CA", label: "Canada (CAD $)" },
  { value: "US", label: "United States (USD $)" },
]
const YEARS = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i))

export default function BusinessInfo() {
  const navigate = useNavigate()
  const [draft, update] = useOnboardingDraft()

  const title = draft.title ?? "Mr."
  const firstName = draft.firstName ?? ""
  const lastName = draft.lastName ?? ""
  const businessName = draft.businessName ?? ""
  const yearStarted = draft.yearStarted ?? ""
  const legalStructure = draft.legalStructure ?? ""
  const country = draft.country ?? DEFAULT_COUNTRY

  const yearOk = isValidYear(yearStarted)

  const canSubmit =
    firstName.trim().length > 0 &&
    businessName.trim().length > 0 &&
    yearOk &&
    legalStructure !== ""

  function chooseCountry(next: string) {
    if (next === country) return
    // Tax numbers and province/state differ by country, so start those fresh
    update({
      country: next,
      region: "",
      businessNumber: "",
      taxRegNumber: "",
      noBN: false,
      noTaxReg: false,
    })
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    update({ country })
    navigate("/tax-details")
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={2} total={6} />
      <h1 className="text-2xl font-bold mb-1">About you and your business</h1>
      <p className="text-gray-500 text-sm mb-6">A few basics so we can set things up for you.</p>

      <form onSubmit={handleNext} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">
            What's your name? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <SelectField label="Title" className="w-28 shrink-0" value={title} onChange={(v) => update({ title: v })} options={TITLES} />
            <input
              type="text"
              value={firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              placeholder="First name"
              autoComplete="given-name"
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>
          <input
            type="text"
            value={lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            placeholder="Last name"
            autoComplete="family-name"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600 mt-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            What's your business name? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => update({ businessName: e.target.value })}
            placeholder="e.g. Acme Consulting Inc."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label htmlFor="year-started" className="block text-sm font-medium mb-1">
            What year did you start your business? <span className="text-red-500">*</span>
          </label>
          <SelectField
            id="year-started"
            value={yearStarted}
            onChange={(v) => update({ yearStarted: v })}
            placeholder="Select a year..."
            options={YEARS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            What is the legal structure of your business? <span className="text-red-500">*</span>
          </label>
          <SelectField
            label="Legal structure"
            value={legalStructure}
            onChange={(v) => update({ legalStructure: v })}
            placeholder="Select your business type"
            options={LEGAL_STRUCTURES}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Business country <span className="text-red-500">*</span>
          </label>
          <SelectField label="Business country" value={country} onChange={chooseCountry} options={COUNTRIES} />
          <p className="text-xs text-gray-500 mt-2">
            You'll do business in {country === "CA" ? "Canadian" : "U.S."} dollars.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-300 text-gray-600 rounded-lg py-3 font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 btn-glass btn-glass-primary"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  )
}
