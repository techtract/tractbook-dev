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
}

// Reads everything from the live session + database, so an account created
// earlier shows the same details on any device or after a refresh.
export function useAccount(): AccountInfo & { reload: () => void } {
  const [info, setInfo] = useState<AccountInfo>(EMPTY)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) {
        if (!cancelled) setInfo({ ...EMPTY, loading: false })
        return
      }
      const email = user.email || ""
      const metaName = String(user.user_metadata?.full_name || "").trim()
      const fullName = metaName || email.split("@")[0]

      const { data: membership } = await supabase
        .from("business_members")
        .select("business_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      let businessName = ""
      let country = ""
      if (membership) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name, country")
          .eq("id", membership.business_id)
          .maybeSingle()
        businessName = biz?.name || ""
        country = biz?.country || ""
      }

      if (!cancelled) {
        setInfo({
          loading: false,
          email,
          fullName,
          hasName: !!metaName,
          initials: makeInitials(metaName, email),
          role: membership?.role || "",
          businessId: membership?.business_id || null,
          businessName,
          country,
        })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [tick])

  return { ...info, reload: () => setTick((t) => t + 1) }
}
