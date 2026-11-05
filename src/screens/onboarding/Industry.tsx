import { useNavigate } from "react-router-dom"
import StepProgress from "./StepProgress"
import SetupIcon, { type SetupIconName } from "../../components/ui/SetupIcon"
import { useOnboardingDraft } from "../../hooks/useOnboardingDraft"

const INDUSTRIES: { key: string; label: string; icon: SetupIconName }[] = [
  { key: "construction", label: "Construction & Real Estate", icon: "construction" },
  { key: "retail", label: "Retail & E-commerce", icon: "retail" },
  { key: "professional", label: "Professional Services", icon: "professional" },
  { key: "health", label: "Health & Wellness", icon: "health" },
  { key: "trades", label: "Trades & Field Service", icon: "trades" },
  { key: "other", label: "Other", icon: "other" },
]

export default function Industry() {
  const navigate = useNavigate()
  const [draft, update] = useOnboardingDraft()
  const selected = draft.industry ?? ""

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    navigate("/business-context")
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={4} total={6} />
      <h1 className="text-2xl font-bold mb-1">What industry are you in?</h1>
      <p className="text-gray-500 text-sm mb-4">
        This personalises your invoices, tax settings and Klara AI for your business type.
      </p>

      <div className="bg-brand-success-soft border border-brand-success-line rounded-lg p-3 mb-6 flex gap-2 text-sm text-brand-success-dark">
        <span>✨</span>
        <span>
          Klara will set up your HST rates, invoice templates and workflow automations based on your business type — no manual configuration needed.
        </span>
      </div>

      <form onSubmit={handleNext}>
        <div role="radiogroup" aria-label="Industry" className="grid grid-cols-2 gap-3 mb-8">
          {INDUSTRIES.map((ind) => {
            const isSelected = selected === ind.key
            return (
              <button
                key={ind.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => update({ industry: ind.key })}
                className={`flex flex-col items-center text-center gap-2 py-4 px-2 rounded-xl border-2 transition-colors ${
                  isSelected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <SetupIcon name={ind.icon} active={isSelected} />
                <span className={`text-sm ${isSelected ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                  {ind.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-300 text-gray-600 rounded-lg py-3 font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!selected}
            className="flex-1 btn-glass btn-glass-primary"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  )
}
