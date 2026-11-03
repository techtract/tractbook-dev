import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const card = "mx-5 mt-4 border border-border rounded-2xl bg-white p-4"
const input = "w-full min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-4 text-base bg-white"
const primary = "w-full min-h-[52px] rounded-full bg-brand-blue text-white font-semibold text-base disabled:opacity-60"
const outline = "w-full min-h-[52px] rounded-full border-[1.5px] border-brand-blue text-brand-blue font-semibold text-base bg-white disabled:opacity-60"

interface Enrollment {
  factorId: string
  qr: string
  secret: string
}

export default function Security() {
  const navigate = useNavigate()
  const location = useLocation()

  // Change password
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  // Two-step verification (authenticator app / TOTP)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enroll, setEnroll] = useState<Enrollment | null>(null)
  const [code, setCode] = useState("")
  const [mfaMsg, setMfaMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [mfaBusy, setMfaBusy] = useState(false)

  // Other devices
  const [devMsg, setDevMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [devBusy, setDevBusy] = useState(false)

  useEffect(() => {
    refreshFactors()
  }, [])

  async function refreshFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = data?.totp?.find((f) => f.status === "verified")
    setFactorId(verified ? verified.id : null)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pw.length < 8) return setPwMsg({ ok: false, text: "Use at least 8 characters." })
    if (pw !== pw2) return setPwMsg({ ok: false, text: "The two passwords don't match." })
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) return setPwMsg({ ok: false, text: error.message })
    setPw("")
    setPw2("")
    setPwMsg({ ok: true, text: "Password updated." })
  }

  async function startEnroll() {
    setMfaMsg(null)
    setMfaBusy(true)
    // Clear out any half-finished setup from an earlier attempt
    const { data: existing } = await supabase.auth.mfa.listFactors()
    for (const f of existing?.all || []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" })
    setMfaBusy(false)
    if (error || !data) return setMfaMsg({ ok: false, text: error?.message || "Could not start setup." })
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    setCode("")
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enroll) return
    setMfaBusy(true)
    setMfaMsg(null)
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId })
    if (cErr || !challenge) {
      setMfaBusy(false)
      return setMfaMsg({ ok: false, text: cErr?.message || "Could not verify." })
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setMfaBusy(false)
    if (error) return setMfaMsg({ ok: false, text: "That code didn't work. Check the 6 digits and try again." })
    setEnroll(null)
    setMfaMsg({ ok: true, text: "Two-step verification is on." })
    refreshFactors()
  }

  async function turnOff() {
    if (!factorId) return
    setMfaBusy(true)
    setMfaMsg(null)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setMfaBusy(false)
    if (error) return setMfaMsg({ ok: false, text: error.message })
    setMfaMsg({ ok: true, text: "Two-step verification is off." })
    refreshFactors()
  }

  async function signOutOthers() {
    setDevBusy(true)
    setDevMsg(null)
    const { error } = await supabase.auth.signOut({ scope: "others" })
    setDevBusy(false)
    setDevMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Signed out of all other devices." })
  }

  const msg = (m: { ok: boolean; text: string } | null) =>
    m && (
      <p role="status" className={`text-sm mt-3 ${m.ok ? "text-success-dark" : "text-error"}`}>
        {m.text}
      </p>
    )

  return (
    <div className="min-h-screen max-w-sm mx-auto pb-8">
      <div className="flex items-center gap-1 pt-5 pr-3 pl-2">
        <button type="button" onClick={() => (location.key !== "default" ? navigate(-1) : navigate("/account"))} aria-label="Back to account" className="w-11 h-11 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-[22px]">Security</h1>
      </div>

      <form onSubmit={changePassword} className={card}>
        <h2 className="text-[17px] mb-3">Change password</h2>
        <label htmlFor="np" className="block text-[13px] font-semibold mb-1.5">New password</label>
        <input id="np" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
        <label htmlFor="cp" className="block text-[13px] font-semibold mt-3 mb-1.5">Confirm new password</label>
        <input id="cp" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
        <p className="text-xs text-body mt-2">At least 8 characters.</p>
        {msg(pwMsg)}
        <button type="submit" disabled={pwBusy} className={`${primary} mt-3`}>
          {pwBusy ? "Updating..." : "Update password"}
        </button>
      </form>

      <div className={card}>
        <h2 className="text-[17px]">Two-step verification</h2>
        <p className="text-[13px] text-body mt-1">
          Ask for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) when you sign in.
        </p>

        {enroll ? (
          <form onSubmit={confirmEnroll} className="mt-4">
            <p className="text-sm">1. Scan this with your authenticator app.</p>
            <img src={enroll.qr} alt="Authenticator QR code" className="w-44 h-44 mx-auto my-3" />
            <p className="text-xs text-body text-center break-all">Or enter this key: <span className="font-mono">{enroll.secret}</span></p>
            <p className="text-sm mt-4 mb-1.5">2. Enter the 6-digit code it shows.</p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-label="6-digit code"
              className={`${input} tracking-widest text-center`}
            />
            {msg(mfaMsg)}
            <div className="flex gap-3 mt-3">
              <button type="button" onClick={() => { setEnroll(null); setMfaMsg(null) }} className={outline}>Cancel</button>
              <button type="submit" disabled={mfaBusy || code.length !== 6} className={primary}>
                {mfaBusy ? "Checking..." : "Turn on"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between mt-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${factorId ? "bg-[#e8f6e5] text-success-dark" : "bg-[#eceffd] text-body"}`}>
                {factorId ? "On" : "Off"}
              </span>
            </div>
            {msg(mfaMsg)}
            <button type="button" disabled={mfaBusy} onClick={factorId ? turnOff : startEnroll} className={`${factorId ? outline : primary} mt-3`}>
              {factorId ? "Turn off" : "Set up"}
            </button>
          </>
        )}
      </div>

      <div className={card}>
        <h2 className="text-[17px]">Other devices</h2>
        <p className="text-[13px] text-body mt-1 mb-3">Signed in somewhere you no longer use? Sign out everywhere except this device.</p>
        {msg(devMsg)}
        <button type="button" disabled={devBusy} onClick={signOutOthers} className={`${outline} ${devMsg ? "mt-3" : ""}`}>
          {devBusy ? "Signing out..." : "Sign out of other devices"}
        </button>
      </div>
    </div>
  )
}
