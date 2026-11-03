import { useLocation, useNavigate } from "react-router-dom"
import { useAccount } from "../hooks/useAccount"
import { Wordmark } from "./ui/Wordmark"

export default function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { initials, fullName, loading } = useAccount()

  return (
    <div className="glass-bar sticky top-2 z-20 flex items-center justify-between mb-4 rounded-full pl-4 pr-1.5 py-1.5">
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
