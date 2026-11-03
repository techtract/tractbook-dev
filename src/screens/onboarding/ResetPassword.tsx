import { useState } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const canSubmit =
    password.length >= 8 && password === confirmPassword && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate("/login"), 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto text-center">
        <div className="text-3xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Password updated</h1>
        <p className="text-gray-500 text-sm">Redirecting you to sign in...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-10" />
      <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
      <p className="text-gray-500 text-sm mb-8">
        Choose a strong password for your Tractbook account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-blue-600 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-blue-700 disabled:bg-blue-200 text-white rounded-lg py-3 font-medium"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  )
}
