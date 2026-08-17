import { useNavigate, useLocation } from "react-router-dom"
import BottomNav from "../../components/BottomNav"

interface DashboardState {
  businessId?: string
  businessName?: string
  firstName?: string
  lastName?: string
  email?: string
  justCreated?: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as DashboardState) || {}

  const fullName =
    [state.firstName, state.lastName].filter(Boolean).join(" ") ||
    state.email?.split("@")[0] ||
    ""

  return (
    <div className="relative min-h-screen bg-white flex flex-col max-w-sm mx-auto">
      <div className="flex-1 px-5 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Tractbook" className="w-6 h-6 rounded" />
            <span className="text-blue-600 font-bold text-lg">tractbook</span>
          </div>
          <button className="text-blue-600 text-sm font-medium">More</button>
        </div>

        {/* Greeting */}
        <h1 className="text-2xl font-bold mb-1">
          Good morning{fullName ? `, ${fullName}` : ""} !
        </h1>
        <p className="text-gray-500 text-sm mb-6">Here's what you need to know today.</p>

        {/* Setup progress card */}
        <button className="w-full bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-900">Set up your account</p>
              <p className="text-sm text-gray-500">Next: Get paid faster</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: "60%" }} />
          </div>
        </button>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => navigate("/coming-soon/invoices")}
            className="bg-blue-50 rounded-xl py-5 flex flex-col items-center gap-2"
          >
            <span className="text-blue-600 text-2xl">+</span>
            <span className="text-blue-700 font-semibold text-sm">Create new...</span>
          </button>
          <button
            onClick={() => navigate("/coming-soon/scan")}
            className="bg-purple-50 rounded-xl py-5 flex flex-col items-center gap-2"
          >
            <span className="text-purple-600 text-2xl">📷</span>
            <span className="text-purple-700 font-semibold text-sm">Scan receipt</span>
          </button>
        </div>

        {/* Business at a glance */}
        <h2 className="font-semibold text-gray-900 mb-3">Business at a glance</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="border border-gray-200 rounded-xl p-4">
            <span className="text-gray-400 text-lg">🕐</span>
            <p className="text-sm text-gray-500 mt-3">No overdue invoices</p>
            <p className="text-lg font-bold text-gray-900">$0</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <span className="text-gray-400 text-lg">📄</span>
            <p className="text-sm text-gray-500 mt-3">No invoices due within next 30 days</p>
            <p className="text-lg font-bold text-gray-900">$0</p>
          </div>
        </div>

        {/* Profit & loss */}
        <h2 className="font-semibold text-gray-900 mb-1">Profit &amp; loss</h2>
        <p className="text-sm text-gray-500 mb-3">
          Income and expenses from the past 12 months.
        </p>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Income
          </span>
          <span className="flex items-center gap-1 text-purple-600">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Expense
          </span>
        </div>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}


