import { useAccount } from "../../hooks/useAccount"
import Dashboard from "./Dashboard"
import AccountantHome from "./AccountantHome"

// Owners get the business dashboard; accountants get their own, smaller home.
export default function DashboardRouter() {
  const { role, loading } = useAccount()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }
  return role === "accountant" ? <AccountantHome /> : <Dashboard />
}
