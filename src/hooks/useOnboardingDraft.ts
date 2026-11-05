import { useCallback, useState } from "react"
import { supabase } from "../lib/supabase"
import { clearDraft, loadDraft, saveDraft, type OnboardingDraft } from "../lib/onboardingDraft"

let listening = false
function clearOnSignOut() {
  if (listening) return
  listening = true
  // Synchronous on purpose: never call supabase inside this callback
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") clearDraft()
  })
}

// A screen's saved answers. update() merges and saves straight away.
export function useOnboardingDraft(): [OnboardingDraft, (patch: Partial<OnboardingDraft>) => void] {
  clearOnSignOut()
  const [draft, setDraft] = useState<OnboardingDraft>(() => loadDraft())
  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft(saveDraft(patch))
  }, [])
  return [draft, update]
}
