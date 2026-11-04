// Business logo rules. Bitmap images only: SVG files can carry scripts, so they are not allowed.

export const LOGO_MAX_BYTES = 1024 * 1024
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

/** Message when the file cannot be used as a logo, or null when it is fine. */
export function validateLogoFile(file: { type: string; size: number }): string | null {
  if (!LOGO_TYPES[file.type]) return "Use a PNG, JPG or WebP image."
  if (file.size > LOGO_MAX_BYTES) return "The image is larger than 1 MB. Choose a smaller one."
  if (file.size === 0) return "That file is empty."
  return null
}

export function logoStoragePath(businessId: string, mimeType: string): string {
  return `${businessId}/logo.${LOGO_TYPES[mimeType]}`
}
