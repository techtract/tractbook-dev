import { useLocation, useNavigate } from "react-router-dom"
import { useAccount } from "../hooks/useAccount"
import { Wordmark } from "./ui/Wordmark"

export default function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { initials, fullName, loading } = useAccount()

  return (
    <div className="flex items-center justify-between mb-4">
      <Wordmark variant="dark" />
      <button
        type="button"
        onClick={() => navigate("/account", { state: { from: location.pathname } })}
        aria-label={fullName ? `Open account for ${fullName}` : "Open account"}
        className="w-11 h-11 rounded-full bg-brand-blue text-white text-sm font-semibold flex items-center justify-center ring-2 ring-brand-blue-light"
      >
        {loading ? "" : initials}
      </button>
    </div>
  )
}
