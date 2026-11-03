// One place for every public contact address and legal link.
// Change a value here and it updates everywhere in the app.

export const CONTACT = {
  support: "support@tractbook.com",
  feedback: "feedback@tractbook.com",
  privacy: "privacy@tractbook.com",
  legal: "legal@tractbook.com",
  security: "security@tractbook.com",
} as const

export const LEGAL_LINKS = [
  { label: "Terms & Conditions", href: "https://www.tractbook.com/legal/terms" },
  { label: "Privacy Policy", href: "https://www.tractbook.com/legal/privacy" },
  { label: "Cookie Policy", href: "https://www.tractbook.com/legal/cookie-policy" },
  { label: "Accessibility", href: "https://www.tractbook.com/legal/accessibility" },
] as const

export const COMPANY = {
  legalName: "Nxtwave Corporation",
  location: "Ontario, Canada",
  website: "https://www.tractbook.com",
} as const
