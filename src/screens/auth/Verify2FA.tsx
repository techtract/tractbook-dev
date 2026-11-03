import { useEffect, useState } from "react"
import { Wordmark } from "../../components/ui/Wordmark"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface FromState {
  from?: string
  fromState?: unknown
}

export default function Verify2FA() {
  const navigate = useNavigate()
  const location = useLocation()
  const incoming = (location.state as FromState) || {}
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        navigate("/login", { replace: true })
        return
      }
      const { data } = await supabase.auth.mfa.listFactors()
      const verified = data?.totp?.find((f) => f.status === "verified")
      if (!verified) {
        // Nothing to verify: carry on
        navigate(incoming.from || "/dashboard", { replace: true, state: incoming.fromState })
        return
      }
      setFactorId(verified.id)
      setReady(true)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.length !== 6) return
    setBusy(true)
    setError(null)
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr || !challenge) {
      setBusy(false)
      setError(cErr?.message || "Could not check the code. Please try again.")
      return
    }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    setBusy(false)
    if (vErr) {
      setCode("")
      setError("That code didn't work. Check the 6 digits and try again.")
      return
    }
    navigate(incoming.from || "/dashboard", { replace: true, state: incoming.fromState })
  }

  async function useDifferentAccount() {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-body text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-10" />
      <h1 className="text-2xl mb-1">Two-step verification</h1>
      <p className="text-body text-sm mb-6">Open your authenticator app and enter the 6-digit code for Tractbook.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="code" className="block text-[13px] font-semibold mb-1.5">6-digit code</label>
        <input
          id="code"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-4 text-xl tracking-widest text-center bg-white"
        />
        {error && <p role="alert" className="text-sm text-[#b3312c] mt-2">{error}</p>}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full min-h-[52px] rounded-full bg-brand-blue text-white font-semibold text-base mt-4 disabled:opacity-60"
        >
          {busy ? "Checking..." : "Continue"}
        </button>
      </form>
      <button type="button" onClick={useDifferentAccount} className="mt-4 min-h-11 text-sm font-semibold text-brand-blue underline">
        Use a different account
      </button>
    </div>
  )
}
