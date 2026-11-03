import { useState } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.trim().length > 0 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto text-center">
        <div className="text-3xl mb-4">📧</div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-8">
          We sent a password reset link to <span className="font-semibold text-gray-900">{email}</span>.
          Click the link to set a new password.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="w-full bg-gray-800 text-white rounded-lg py-3 font-medium"
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-10" />
      <h1 className="text-2xl font-bold mb-1">Forgot your password?</h1>
      <p className="text-gray-500 text-sm mb-8">
        Enter your email and we'll send you a link to reset it.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-blue-700 disabled:bg-blue-200 text-white rounded-lg py-3 font-medium"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm mt-6">
        Remembered your password?{" "}
        <a href="/login" className="text-blue-600 font-medium">Sign in</a>
      </p>
    </div>
  )
}
