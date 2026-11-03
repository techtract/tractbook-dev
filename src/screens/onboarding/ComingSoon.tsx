import { useNavigate, useParams } from "react-router-dom"

const FEATURE_LABELS: Record<string, string> = {
  sales: "Sales",
  accounting: "Accounting",
  payments: "Payments",
}

export default function ComingSoon() {
  const navigate = useNavigate()
  const { feature } = useParams<{ feature: string }>()
  const label = FEATURE_LABELS[feature || ""] || "This feature"

  return (
    <div className="relative min-h-screen bg-white flex flex-col max-w-sm mx-auto px-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <img src="/favicon.svg" alt="Tractbook" className="w-14 h-14 rounded-xl mb-6" />
        <h1 className="text-2xl font-bold mb-2">{label} is on its way</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          We're building {label.toLowerCase()} right now, so it's just as thoughtful as the rest of Tractbook. Check back soon.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-8 btn-glass btn-glass-primary"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
