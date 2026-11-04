import { useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { LOGO_TYPES, logoStoragePath, validateLogoFile } from "../../lib/logo"

type Props = {
  businessId: string | null
  logoUrl: string | null
  onChange: (url: string | null) => void
}

export default function LogoPicker({ businessId, logoUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!businessId) return
    const problem = validateLogoFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)

    // One logo per business. Remove any older file first so a changed format does not leave a stray copy.
    const others = Object.values(LOGO_TYPES).map((ext) => `${businessId}/logo.${ext}`)
    await supabase.storage.from("business-logos").remove(others)

    const path = logoStoragePath(businessId, file.type)
    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { contentType: file.type, upsert: true })
    if (uploadError) {
      setError(uploadError.message)
      setBusy(false)
      return
    }

    const { data } = supabase.storage.from("business-logos").getPublicUrl(path)
    const url = `${data.publicUrl}?v=${Date.now()}` // new address so browsers show the new image
    const { error: saveError } = await supabase.from("businesses").update({ logo_url: url }).eq("id", businessId)
    if (saveError) {
      setError(saveError.message)
      setBusy(false)
      return
    }
    onChange(url)
    setBusy(false)
  }

  async function handleRemove() {
    if (!businessId || busy) return
    setBusy(true)
    setError(null)
    await supabase.storage.from("business-logos").remove(Object.values(LOGO_TYPES).map((ext) => `${businessId}/logo.${ext}`))
    const { error: saveError } = await supabase.from("businesses").update({ logo_url: null }).eq("id", businessId)
    if (saveError) {
      setError(saveError.message)
      setBusy(false)
      return
    }
    onChange(null)
    setBusy(false)
  }

  return (
    <div className="mb-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) handleFile(file)
        }}
      />
      {logoUrl ? (
        <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <img src={logoUrl} alt="Business logo" className="h-14 max-w-[40%] object-contain" />
          <div className="ml-auto flex gap-2">
            <button onClick={() => inputRef.current?.click()} disabled={busy} className="text-blue-700 text-xs font-semibold">
              {busy ? "Saving..." : "Change"}
            </button>
            <button onClick={handleRemove} disabled={busy} className="text-red-600 text-xs font-semibold">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || !businessId}
          className="w-full border border-dashed border-gray-300 rounded-xl py-4 text-center"
        >
          <span className="text-blue-700 text-sm font-semibold">{busy ? "Uploading..." : "+ Add logo"}</span>
          <p className="text-gray-400 text-xs mt-0.5">PNG, JPG or WebP, max 1 MB</p>
        </button>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
