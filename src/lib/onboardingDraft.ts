// Everything the person has typed during setup, kept for the browser tab so that
// pressing Back never wipes a screen. Cleared once the business is created.

export interface OnboardingDraft {
  title?: string
  firstName?: string
  lastName?: string
  businessName?: string
  yearStarted?: string
  legalStructure?: string
  country?: string
  businessNumber?: string
  noBN?: boolean
  taxRegNumber?: string
  noTaxReg?: boolean
  region?: string
  industry?: string
  bookkeeping?: string
  goal?: string
  teamSize?: string
  accountantChoice?: "yes" | "no" | "self" | ""
  accountantEmail?: string
  accountantName?: string
  inviteSaved?: boolean
}

const KEY = "tractbook.onboarding.draft"

function store(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null
  } catch {
    return null
  }
}

export function loadDraft(): OnboardingDraft {
  try {
    const raw = store()?.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as OnboardingDraft) : {}
  } catch {
    return {}
  }
}

export function saveDraft(patch: Partial<OnboardingDraft>): OnboardingDraft {
  const next = { ...loadDraft(), ...patch }
  try {
    store()?.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: the screens still work, they just can't remember
  }
  return next
}

export function clearDraft() {
  try {
    store()?.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

export const DEFAULT_COUNTRY = "CA"

export function isValidYear(value: string, now = new Date()): boolean {
  if (!/^\d{4}$/.test(value.trim())) return false
  const y = Number(value)
  return y >= 1900 && y <= now.getFullYear()
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

// The arguments for the create_business_with_owner database function.
export function buildBusinessArgs(d: OnboardingDraft) {
  const invite = d.accountantChoice === "yes" && d.accountantEmail?.trim()
  return {
    p_name: d.businessName?.trim() || "Untitled Business",
    p_legal_structure: d.legalStructure || null,
    p_year_started: d.yearStarted ? Number(d.yearStarted) : null,
    p_country: d.country || DEFAULT_COUNTRY,
    p_industry: d.industry || null,
    p_business_number: d.noBN ? null : d.businessNumber?.trim() || null,
    p_tax_registration_number: d.noTaxReg ? null : d.taxRegNumber?.trim() || null,
    p_region: d.region || null,
    p_bookkeeping_method: d.bookkeeping || null,
    p_main_goal: d.goal || null,
    p_team_size: d.teamSize || null,
    p_accountant_email: invite ? d.accountantEmail!.trim().toLowerCase() : null,
    p_accountant_name: invite ? d.accountantName?.trim() || null : null,
  }
}
