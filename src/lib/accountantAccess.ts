// What an accountant can open. They review the books; they don't create or change sales documents.
// This hides the screens; the database rules are what truly protect the data.

const BLOCKED = [
  /\/new$/,
  /\/edit$/,
  /\/send$/,
  /\/payment$/,
  /^\/business$/,
  /^\/ocr\/scan$/,
  /^\/ocr\/review$/,
]

export function isBlockedForAccountant(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/"
  return BLOCKED.some((re) => re.test(path))
}
