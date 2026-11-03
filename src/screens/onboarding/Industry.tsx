import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import StepProgress from "./StepProgress"

const INDUSTRIES = [
  { key: "construction", label: "Construction & Real Estate", icon: "🏗️" },
  { key: "retail", label: "Retail & E-commerce", icon: "🛍️" },
  { key: "professional", label: "Professional Services", icon: "💼" },
  { key: "health", label: "Health & Wellness", icon: "🩺" },
  { key: "trades", label: "Trades & Field Service", icon: "🔧" },
  { key: "other", label: "Other", icon: "◈" },
]

export default function Industry() {
  const navigate = useNavigate()
  const location = useLocation()
  const priorState = (location.state as Record<string, unknown>) || {}

  const [selected, setSelected] = useState<string>("")

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    navigate("/business-context", {
      state: { ...priorState, industry: selected },
    })
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
          Klara will set up your HST rates, invoice templates and workflow automations based on your business type — no manual configurationneeded.
        </span>
      </div>

      <form onSubmit={handleNext}>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.key}
              type="button"
              onClick={() => setSelected(ind.key)}
              className={`flex flex-col items-center text-center gap-2 py-4 px-2 rounded-lg border-2 ${
                selected === ind.key
                  ? "border-blue-600 bg-blue-50"
                  : "border-transparent"
              }`}
            >
              <span className="text-3xl">{ind.icon}</span>
              <span
                className={`text-sm ${
                  selected === ind.key ? "font-semibold text-gray-900" : "text-gray-600"
                }`}
              >
                {ind.label}
              </span>
            </button>
          ))}
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
