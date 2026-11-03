import { useState, useEffect, useRef } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const CODE_LENGTH = 6
const RESEND_SECONDS = 45

interface IncomingState {
  phone?: string
  fullPhone?: string
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

export default function VerifyCode() {
  const navigate = useNavigate()
  const location = useLocation()
  const incoming = (location.state as IncomingState) || {}
  const phone = incoming.phone || "+1 (000) 000-0000"

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const showSkip = import.meta.env.DEV || isAllowedTestUser(incoming.email)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every((d) => d !== "")) {
      handleVerify(next.join(""))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(code: string) {
    if (!incoming.fullPhone) {
      setError("Missing phone number — please go back and re-enter it.")
      return
    }

    setVerifying(true)
    setError(null)

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: incoming.fullPhone,
      token: code,
      type: "phone_change",
    })

    setVerifying(false)

    if (verifyError) {
      setError("That code didn't match. Check it and try again.")
      setDigits(Array(CODE_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
      return
    }

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

  async function handleResend() {
    setSecondsLeft(RESEND_SECONDS)
    setDigits(Array(CODE_LENGTH).fill(""))
    setError(null)
    inputRefs.current[0]?.focus()

    if (incoming.fullPhone) {
      await supabase.auth.updateUser({ phone: incoming.fullPhone })
    }
  }

  const timerLabel = `00:${secondsLeft.toString().padStart(2, "0")}`

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-8" />
      <h1 className="text-2xl font-bold mb-1">Enter verification code</h1>
      <p className="text-gray-500 text-sm mb-1">
        We sent a six digit code to{" "}
        <span className="font-semibold text-gray-900">{phone}</span>.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 text-sm font-medium mb-8 text-left"
      >
        Change
      </button>

      <div className="flex gap-2 justify-between mb-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={verifying}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-lg border border-gray-300 rounded-lg outline-none focus:border-blue-600 disabled:bg-gray-100"
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {verifying && <p className="text-gray-500 text-sm mb-4">Verifying...</p>}

      {secondsLeft > 0 ? (
        <p className="text-red-500 text-xs mb-4">
          Don't see it? Send a new code in {timerLabel}
        </p>
      ) : (
        <button
          onClick={handleResend}
          className="w-full mb-4 mt-2 btn-glass btn-glass-primary"
        >
          Send a new code
        </button>
      )}

      {showSkip && (
        <button
          onClick={handleDevSkip}
          className="text-gray-400 text-xs underline mb-6"
        >
          Skip for now (test mode)
        </button>
      )}

      <p className="text-center text-xs text-gray-500">
        Your data is secure and won't be shared with anyone. Read the details in our{" "}
        <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
      </p>
    </div>
  )
}
