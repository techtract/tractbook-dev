import { useState } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      setLoading(false)
      setError(signInError.message)
      return
    }

    const userId = data.user.id
    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, businesses(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    setLoading(false)

    const existingUser = !!membership
    const businessId = membership?.business_id
    const businessName = (membership?.businesses as { name?: string } | null)?.name

    navigate("/verify-phone", {
      state: {
        existingUser,
        businessId,
        businessName,
        email: data.user.email,
      },
    })
  }
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-10" />
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-gray-500 text-sm mb-8">
        Sign in to continue to Tractbook
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
        <div>
          <div className="flex justify-between items-baseline">
            <label className="block text-sm font-medium mb-1">Password</label>
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
            placeholder="Enter your password"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
          <div className="text-right mt-1">
            <a href="/forgot-password" className="text-blue-600 text-sm">
              Forgot password?
            </a>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-gray-800 disabled:bg-gray-300 text-white rounded-lg py-3 font-medium"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm mt-6">
        Don't have an account?{" "}
        <a href="/sign-up" className="text-blue-600 font-medium">Sign up now.</a>
      </p>
    </div>
  )
}
