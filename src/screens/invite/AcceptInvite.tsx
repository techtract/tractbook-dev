import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { Wordmark } from "../../components/ui/Wordmark"
import { clearPendingInvite, getPendingInvite, setPendingInvite } from "../../lib/pendingInvite"

interface Preview {
  valid: boolean
  reason?: string
  business_name?: string
  inviter_name?: string
  role?: string
  email?: string
}

// Where the link in the invite email lands. Shows who invited you, asks you to sign in or
// create an account if needed, then joins you to the business.
export default function AcceptInvite() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token") || getPendingInvite()

  const [preview, setPreview] = useState<Preview | null>(null)
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    setPendingInvite(token)
    let cancelled = false
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const { data, error: err } = await supabase.rpc("get_invite_preview", { p_token: token })
      if (cancelled) return
      if (err) console.error("get_invite_preview failed", err)
      const result = (data as Preview | null) ?? { valid: false, reason: "not_found" }
      if (!result.valid) clearPendingInvite()
      setPreview(result)
      setSignedInEmail(sessionData.session?.user.email ?? null)
      setChecking(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function join() {
    if (!token || joining) return
    setJoining(true)
    setError(null)
    const { data, error: err } = await supabase.rpc("accept_business_invite", { p_token: token })
    const result = data as { ok: boolean; reason?: string } | null
    if (err || !result?.ok) {
      console.error("accept_business_invite failed", err, result)
      if (result?.reason && result.reason !== "wrong_email") clearPendingInvite()
      setError(messageFor(result?.reason))
      setJoining(false)
      return
    }
    clearPendingInvite()
    navigate("/dashboard", { replace: true })
  }

  async function switchAccount() {
    await supabase.auth.signOut()
    setSignedInEmail(null)
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <Wordmark variant="dark" className="mb-8" />
      {children}
    </div>
  )

  if (checking) return shell(<p className="text-gray-500 text-sm">Checking your invite...</p>)

  if (!token || !preview || !preview.valid) {
    return shell(
      <>
        <h1 className="text-2xl font-bold mb-2">This invite can't be used</h1>
        <p className="text-gray-500 text-sm mb-6">{messageFor(preview?.reason)}</p>
        <button onClick={() => navigate("/")} className="w-full btn-glass btn-glass-primary">
          Go to Tractbook
        </button>
      </>
    )
  }

  const who = preview.inviter_name ? `${preview.inviter_name} has` : "You've been"
  const header = (
    <>
      <h1 className="text-2xl font-bold mb-2">Join {preview.business_name}</h1>
      <p className="text-gray-500 text-sm mb-6">
        {who} invited you to review the books for <b>{preview.business_name}</b> as their accountant.
        You'll see the sales documents, receipts and customers, and you can't change them.
      </p>
    </>
  )

  if (!signedInEmail) {
    return shell(
      <>
        {header}
        <p className="text-xs text-gray-500 mb-4">
          This invite is for <b>{preview.email}</b>. Use that email address.
        </p>
        <button onClick={() => navigate("/sign-up")} className="w-full btn-glass btn-glass-primary mb-3">
          Create my account
        </button>
        <button onClick={() => navigate("/login")} className="w-full btn-glass btn-glass-secondary">
          I already have an account
        </button>
      </>
    )
  }

  const wrongAccount = preview.email && signedInEmail.toLowerCase() !== preview.email.toLowerCase()

  return shell(
    <>
      {header}
      {wrongAccount ? (
        <>
          <p className="text-sm text-red-600 mb-4">
            You're signed in as {signedInEmail}, but this invite is for {preview.email}.
          </p>
          <button onClick={switchAccount} className="w-full btn-glass btn-glass-primary">
            Sign out and use {preview.email}
          </button>
        </>
      ) : (
        <>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button onClick={join} disabled={joining} className="w-full btn-glass btn-glass-primary">
            {joining ? "Joining..." : `Join ${preview.business_name}`}
          </button>
        </>
      )}
    </>
  )
}

function messageFor(reason?: string): string {
  switch (reason) {
    case "expired":
      return "This invite has expired. Ask the business owner to send a new one."
    case "used":
      return "This invite has already been used."
    case "wrong_email":
      return "This invite was sent to a different email address. Sign in with the address it was sent to."
    case "has_business":
      return "This account already belongs to a business. Use a different email address to join as an accountant."
    case "not_signed_in":
      return "Please sign in first."
    default:
      return "We couldn't find this invite. Ask the business owner to send a new one."
  }
}
