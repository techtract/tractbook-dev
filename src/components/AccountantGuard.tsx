import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAccount } from "../hooks/useAccount"
import { isBlockedForAccountant } from "../lib/accountantAccess"

// Sits inside the signed-in routes. Owners pass straight through; accountants are kept
// out of screens that create or change things and see a small "read only" strip.
export default function AccountantGuard() {
  const { role, loading } = useAccount()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (role === "accountant") {
    if (isBlockedForAccountant(location.pathname)) {
      return <Navigate to="/dashboard" replace />
    }
    return (
      <>
        <div className="bg-blue-50 text-blue-700 text-xs font-medium text-center py-1.5">
          Accountant view · read only
        </div>
        <Outlet />
      </>
    )
  }

  return <Outlet />
}
