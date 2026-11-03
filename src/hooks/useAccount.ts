import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { makeInitials } from "../lib/initials"

export interface AccountInfo {
  loading: boolean
  email: string
  fullName: string
  hasName: boolean
  initials: string
  role: string
  businessId: string | null
  businessName: string
  country: string
  failed: boolean
}

const EMPTY: AccountInfo = {
  loading: true,
  email: "",
  fullName: "",
  hasName: false,
  initials: "",
  role: "",
  businessId: null,
  businessName: "",
  country: "",
  failed: false,
}

// Last good result, shared by every screen so the header and the Account page
// show details instantly instead of each waiting on its own round trip.
let cache: AccountInfo | null = null
let listening = false

function listenForSignOut() {
  if (listening) return
  listening = true
  // Synchronous on purpose: never call supabase inside this callback (it can deadlock the auth lock)
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") cache = null
  })
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timed out")), ms)
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v) },
      (e) => { clearTimeout(t); reject(e) }
    )
  })
}

async function fetchAccount(): Promise<AccountInfo> {
  // getSession reads the stored session (no network), so it can't hang on a slow call
  const { data: sessionData } = await withTimeout(supabase.auth.getSession(), 8000)
  const user = sessionData.session?.user
  if (!user) return { ...EMPTY, loading: false }

  const email = user.email || ""
  const metaName = String(user.user_metadata?.full_name || "").trim()
  const fullName = metaName || email.split("@")[0]

  const { data: membership, error: mErr } = await withTimeout(
    supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    8000
  )
  if (mErr) console.error("useAccount: membership lookup failed", mErr)

  let businessName = ""
  let country = ""
  if (membership) {
    const { data: biz, error: bErr } = await withTimeout(
      supabase.from("businesses").select("name, country").eq("id", membership.business_id).maybeSingle(),
      8000
    )
    if (bErr) console.error("useAccount: business lookup failed", bErr)
    businessName = biz?.name || ""
    country = biz?.country || ""
  }

  return {
    loading: false,
    email,
    fullName,
    hasName: !!metaName,
    initials: makeInitials(metaName, email),
    role: membership?.role || "",
    businessId: membership?.business_id || null,
    businessName,
    country,
    failed: false,
  }
}

// Reads everything from the live session + database, so an account created
// earlier shows the same details on any device or after a refresh.
export function useAccount(): AccountInfo & { reload: () => void } {
  const [info, setInfo] = useState<AccountInfo>(cache ?? EMPTY)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    listenForSignOut()
    let cancelled = false
    fetchAccount()
      .then((result) => {
        cache = result.email ? result : null
        if (!cancelled) setInfo(result)
      })
      .catch((err) => {
        console.error("useAccount: could not load account details", err)
        if (!cancelled) setInfo((prev) => ({ ...prev, loading: false, failed: !prev.email }))
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { ...info, reload: () => setTick((t) => t + 1) }
}
