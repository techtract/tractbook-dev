import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { Wordmark } from "./ui/Wordmark"
import {
  MAX_PASSWORD_TRIES,
  clearLastActive,
  getAutoLockEnabled,
  isExpired,
  readLastActive,
  writeLastActive,
} from "../lib/autolock"

const CHECK_EVERY_MS = 5000
const WRITE_EVERY_MS = 5000

type Who = { email: string; hasPassword: boolean }

export default function AutoLock() {
  const [who, setWho] = useState<Who | null>(null)
  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const tries = useRef(0)
  const lastWrite = useRef(0)
  const lockedRef = useRef(false)
  lockedRef.current = locked

  // Who is signed in? (local read only; never call supabase inside the auth callback)
  useEffect(() => {
    let cancelled = false
    function apply(user: { email?: string | null; app_metadata?: { providers?: string[] } } | null | undefined) {
      if (cancelled) return
      if (!user) {
        setWho(null)
        setLocked(false)
        return
      }
      const providers = user.app_metadata?.providers || []
      setWho({ email: user.email || "", hasPassword: providers.includes("email") })
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") clearLastActive()
      if (event === "SIGNED_IN") {
        const now = Date.now()
        writeLastActive(now)
        lastWrite.current = now
      }
      apply(session?.user)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const check = useCallback(() => {
    if (lockedRef.current) return
    if (!getAutoLockEnabled()) return
    if (isExpired(readLastActive(), Date.now())) {
      setLocked(true)
    }
  }, [])

  // Track activity and check for inactivity while signed in
  useEffect(() => {
    if (!who) return
    // First time on this device/session: start the clock now
    if (readLastActive() === null) writeLastActive(Date.now())
    check() // page reload or tab restore after a long gap locks immediately

    function touch() {
      if (lockedRef.current) return
      const now = Date.now()
      if (now - lastWrite.current >= WRITE_EVERY_MS) {
        lastWrite.current = now
        writeLastActive(now)
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") check()
    }
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"]
    events.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }))
    document.addEventListener("visibilitychange", onVisible)
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch, { capture: true }))
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(timer)
    }
  }, [who, check])

  async function signOutNow() {
    clearLastActive()
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (!who || !password) return
    setChecking(true)
    setError(null)
    // Check the password on a throwaway client so the real session (and any
    // two-step verification level) is left exactly as it is.
    const probe = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { error: err } = await probe.auth.signInWithPassword({ email: who.email, password })
    setChecking(false)
    if (err) {
      tries.current += 1
      if (tries.current >= MAX_PASSWORD_TRIES) {
        await signOutNow()
        return
      }
      setError("That password isn't right. Please try again.")
      return
    }
    tries.current = 0
    setPassword("")
    const now = Date.now()
    lastWrite.current = now
    writeLastActive(now)
    setLocked(false)
  }

  if (!who || !locked) return null

  // Rendered on <body>, outside #root, so the desktop phone-frame styles do not shrink it.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Tractbook is locked" className="fixed inset-0 z-[100] bg-white flex overflow-y-auto">
      <div className="m-auto w-full max-w-[24rem] px-6 py-10">
        <Wordmark variant="dark" className="mb-8" />
        <h1 className="text-2xl font-bold mb-1">Tractbook is locked</h1>
        <p className="text-body text-sm mb-6">
          You were away for a while, so we locked it to keep your books safe.
        </p>
        {who.hasPassword ? (
          <form onSubmit={unlock}>
            <p className="text-[13px] text-body mb-3 truncate">Signed in as {who.email}</p>
            <label htmlFor="lock-pw" className="block text-[13px] font-semibold mb-1.5">Password</label>
            <input
              id="lock-pw"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-4 text-base"
            />
            {error && <p role="alert" className="text-sm text-[#b3312c] mt-2">{error}</p>}
            <button type="submit" disabled={checking || !password} className="mt-4 w-full min-h-[52px] rounded-full bg-brand-blue text-white font-semibold disabled:opacity-60">
              {checking ? "Checking..." : "Unlock"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-body mb-2">You signed in with Google, so please sign in again to continue.</p>
        )}
        <button type="button" onClick={signOutNow} className="mt-3 w-full min-h-[52px] rounded-full border-[1.5px] border-brand-blue text-brand-blue font-semibold">
          {who.hasPassword ? "Sign out" : "Sign in again"}
        </button>
      </div>
    </div>,
    document.body,
  )
}
