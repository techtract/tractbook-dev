import { useNavigate } from "react-router-dom"
import StepProgress from "./StepProgress"

export default function RoleSelect() {
  const navigate = useNavigate()

  function handleBusinessOwner() {
    navigate("/business-info")
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={1} total={6} />
      <h1 className="text-2xl font-bold mb-1">How will you use Tractbook?</h1>
      <p className="text-gray-500 text-sm mb-8">
        Choose the setup that fits your needs.
      </p>

      <div className="space-y-4">
        <div className="border-2 border-blue-600 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-blue-600 text-2xl">📊</span>
            <span className="font-semibold text-gray-900">Business Owner</span>
          </div>
          <button
            onClick={handleBusinessOwner}
            className="w-full btn-glass btn-glass-primary"
          >
            Continue as Business Owner
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-gray-400 text-2xl">🧾</span>
            <span className="font-semibold text-gray-500">Accountant</span>
          </div>
          <button
            disabled
            className="w-full bg-gray-200 text-gray-400 rounded-lg py-3 font-medium cursor-not-allowed"
          >
            Continue as Accountant
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-gray-400 text-2xl">💼</span>
            <span className="font-semibold text-gray-500">Solo/freelancer</span>
            <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5">New</span>
          </div>
          <button
            disabled
            className="w-full bg-gray-200 text-gray-400 rounded-lg py-3 font-medium cursor-not-allowed"
          >
            Coming soon
          </button>
        </div>
      </div>

      <div className="mt-6 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Confused about which role to pick?</span>
        <button className="text-blue-600 text-sm font-medium border border-blue-600 rounded-full px-3 py-1">
          View Guide
        </button>
      </div>
    </div>
  )
}
