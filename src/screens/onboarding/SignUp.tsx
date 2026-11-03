import { useState } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type PasswordState = "empty" | "weak" | "medium" | "strong"

function getPasswordState(password: string): PasswordState {
  if (password.length === 0) return "empty"
  if (password.length < 8) return "weak"
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const complexity = [hasUpper, hasNumber, hasSymbol].filter(Boolean).length
  if (password.length >= 12 || complexity >= 2) return "strong"
  return "medium"
}

const strengthMessage: Record<PasswordState, { text: string; className: string } | null> = {
  empty: { text: "At least 8 characters, but longer is better.", className: "text-gray-500" },
  weak: { text: "Uh oh, this password isn't strong enough", className: "text-red-500" },
  medium: { text: "At least 8 characters, but longer is better.", className: "text-gray-500" },
  strong: { text: "This is a very strong password!", className: "text-brand-success-dark" },
}

export default function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)

  const passwordState = getPasswordState(password)
  const message = strengthMessage[passwordState]
  const canSubmit = email.trim().length > 0 && password.length >= 8 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      // Email confirmation is required — Supabase already sent the
      // verification link. Show the confirmation screen and let the
      // user proceed manually once they've actually verified.
      setVerificationSent(true)
      return
    }

    navigate("/verify-phone")
  }

  async function handleGoogleSignUp() {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) setError(oauthError.message)
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto text-center">
        <div className="text-3xl mb-4">📧</div>
        <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
        <p className="text-gray-500 text-sm mb-8">
          We sent a verification link to <span className="font-semibold text-gray-900">{email}</span>.
          Click the link to activate your account, then sign in to continue.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="w-full bg-gray-800 text-white rounded-lg py-3 font-medium"
        >
          Go to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-10" />
      <h1 className="text-2xl font-bold mb-1">Financial clarity starts here</h1>
      <p className="text-gray-500 text-sm mb-8">
        Tractbook helps freelancers, consultants, and small businesses around the world simplify their finances
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
            placeholder="Create a password"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
          />
          {message && (
            <p className={`text-xs mt-1 ${message.className}`}>{message.text}</p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-gray-800 disabled:bg-gray-300 text-white rounded-lg py-3 font-medium"
        >
          {loading ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-sm">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={handleGoogleSignUp}
        className="w-full mb-3 btn-glass btn-glass-primary"
      >
        Sign up with Google
      </button>

      <p className="text-center text-xs text-gray-500 mt-4">
        By signing up, you are indicating that you have read and agree to the{" "}
        <a href="/terms" className="text-blue-600 underline">Terms of Use</a> and{" "}
        <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
      </p>

      <p className="text-center text-sm mt-6">
        Already have an account?{" "}
        <a href="/login" className="text-blue-600 font-medium">Sign in now.</a>
      </p>
    </div>
  )
}


