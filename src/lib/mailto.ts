export function buildMailto(to: string, subject: string, body = ""): string {
  const params = new URLSearchParams()
  params.set("subject", subject)
  if (body) params.set("body", body)
  // URLSearchParams encodes spaces as "+", which mail apps show literally.
  return `mailto:${to}?${params.toString().replace(/\+/g, "%20")}`
}

export function diagnosticsText(info: { version: string; email: string; businessId: string; path: string }): string {
  return [
    "",
    "",
    "-----",
    "Please keep the lines below so we can find the problem faster.",
    `App version: ${info.version}`,
    `Account: ${info.email || "unknown"}`,
    `Business ID: ${info.businessId || "unknown"}`,
    `Screen: ${info.path}`,
    `Browser: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}`,
  ].join("\n")
}
