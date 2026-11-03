import { useState } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface IncomingState {
  existingUser?: boolean
  businessId?: string
  businessName?: string
  email?: string
}

const TEAM_TEST_EMAILS = [
  "rakeshchandra.chandra21@gmail.com",
  "kloroncanada@gmail.com",
]

function isAllowedTestUser(email?: string): boolean {
  if (!email) return false
  const normalized = email.toLowerCase()
  if (normalized.endsWith("@nxtwave.ca")) return true
  return TEAM_TEST_EMAILS.includes(normalized)
}

function isValidNANPNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 10
}

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export default function VerifyPhone() {
  const navigate = useNavigate()
  const location = useLocation()
  const incoming = (location.state as IncomingState) || {}
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rawDigits = phone.replace(/\D/g, "")
  const canSubmit = isValidNANPNumber(phone) && !loading
  const showSkip = import.meta.env.DEV || isAllowedTestUser(incoming.email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const fullPhone = `+1${rawDigits}`
    const displayPhone = `+1 (${rawDigits.slice(0, 3)}) ${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`

    const { error: otpError } = await supabase.auth.updateUser({ phone: fullPhone })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    navigate("/loading", {
      state: {
        nextPath: "/verify-code",
        phone: displayPhone,
        fullPhone,
        ...incoming,
      },
    })
  }

  function handleDevSkip() {
    if (incoming.existingUser) {
      navigate("/loading", {
        state: {
          nextPath: "/dashboard",
          businessId: incoming.businessId,
          businessName: incoming.businessName,
          justCreated: false,
        },
      })
    } else {
      navigate("/loading", { state: { nextPath: "/role" } })
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-8" />
      <h1 className="text-2xl font-bold mb-1">Keep your account secure</h1>
      <p className="text-gray-500 text-sm mb-8">
        Enter your number and we'll send a code to secure your account. No spam.
      </p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block text-sm font-medium mb-1">Enter phone number</label>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-600">
          <span className="flex items-center px-3 text-gray-500 border-r border-gray-300 bg-gray-50">
            +1
          </span>
          <input
            type="tel"
            value={formatPhoneDisplay(phone)}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="flex-1 px-4 py-3 outline-none"
          />
        </div>
        <p className="text-red-500 text-xs">
          Valid US/Canadian phone numbers only.
          <br />
          Message and data rates may apply.
        </p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-4 btn-glass btn-glass-primary"
        >
          {loading ? "Sending code..." : "Next"}
        </button>
      </form>

      {showSkip && (
        <button
          type="button"
          onClick={handleDevSkip}
          className="text-gray-400 text-xs underline mt-4 text-center"
        >
          Skip phone verification (test mode)
        </button>
      )}

      <p className="text-center text-xs text-gray-500 mt-4">
        Your data is secure and won't be shared with anyone. Read the details in our{" "}
        <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
      </p>
    </div>
  )
}
