import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function ScanReceipt() {
  const navigate = useNavigate()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const browseInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file) return
    setUploading(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("You must be signed in to scan a receipt.")
      setUploading(false)
      return
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!membership) {
      setError("No business found for this account.")
      setUploading(false)
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const storagePath = `${membership.business_id}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: scanResult, error: fnError } = await supabase.functions.invoke("scan-receipt", {
      body: { storagePath },
    })

    setUploading(false)

    if (fnError || !scanResult) {
      setError("Could not read this document automatically. You can still enter it manually on the next screen.")
      navigate("/ocr/review", { state: { storagePath, extracted: null } })
      return
    }

    navigate("/ocr/review", { state: { storagePath, extracted: scanResult } })
  }

  function triggerInput(ref: React.RefObject<HTMLInputElement | null>) {
    ref.current?.click()
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="Close" className="w-10 h-10 -ml-2 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <h1 className="text-lg font-bold">Scan receipt</h1>
        <div className="w-6" />
      </div>

      <p className="text-xs text-gray-500 mb-4">Choose how you'd like to add this receipt or bill.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={() => triggerInput(cameraInputRef)}
        disabled={uploading}
        className="w-full flex items-center gap-3 border border-border rounded-2xl p-3.5 mb-3 bg-white text-left disabled:opacity-50"
      >
        <span className="w-10 h-10 rounded-xl bg-[#eef3ff] text-brand-blue flex items-center justify-center shrink-0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Camera</span>
          <span className="block text-xs text-gray-500">Take a photo now</span>
        </span>
      </button>

      <button
        onClick={() => triggerInput(galleryInputRef)}
        disabled={uploading}
        className="w-full flex items-center gap-3 border border-border rounded-2xl p-3.5 mb-3 bg-white text-left disabled:opacity-50"
      >
        <span className="w-10 h-10 rounded-xl bg-[#eef3ff] text-brand-blue flex items-center justify-center shrink-0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 9" /></svg></span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Gallery</span>
          <span className="block text-xs text-gray-500">Choose an existing photo</span>
        </span>
      </button>

      <button
        onClick={() => triggerInput(browseInputRef)}
        disabled={uploading}
        className="w-full flex items-center gap-3 border border-border rounded-2xl p-3.5 mb-3 bg-white text-left disabled:opacity-50"
      >
        <span className="w-10 h-10 rounded-xl bg-[#eef3ff] text-brand-blue flex items-center justify-center shrink-0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg></span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Browse files</span>
          <span className="block text-xs text-gray-500">Upload a PDF or image</span>
        </span>
      </button>

      <button
        disabled
        className="w-full flex items-center gap-3 border border-border rounded-2xl p-3.5 mb-3 bg-white text-left opacity-50 cursor-not-allowed"
      >
        <span className="w-10 h-10 rounded-xl bg-[#f2f2f2] text-muted flex items-center justify-center shrink-0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></span>
        <span>
          <span className="block text-sm font-semibold text-gray-500">Forward an email</span>
          <span className="block text-xs text-gray-400">Coming soon</span>
        </span>
      </button>

      {uploading && (
        <p className="text-xs text-gray-500 mt-4 text-center">Uploading and analyzing your document...</p>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={browseInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}
