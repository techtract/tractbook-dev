import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { detectZone, zoneLabel, zoneOptions } from "../../lib/timezones"

const rowClass =
  "w-full min-h-14 px-4 flex items-center gap-3 text-left text-[15px] font-medium bg-white border-t border-border first:border-t-0"

export default function TimeZoneRow({ businessId }: { businessId: string | null }) {
  const [saved, setSaved] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const browserZone = detectZone()
  const current = saved || browserZone

  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) console.error("timezone lookup failed", err)
        setSaved((data as { timezone?: string | null } | null)?.timezone || null)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [businessId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from("businesses").update({ timezone: draft }).eq("id", businessId)
    setSaving(false)
    if (err) {
      console.error("timezone save failed", err)
      setError("We couldn't save your time zone. Please try again.")
      return
    }
    setSaved(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="p-4 bg-white border-t border-border">
        <label htmlFor="tz" className="block text-[13px] font-semibold mb-1.5">Time zone</label>
        <select
          id="tz"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-3 text-base bg-white"
        >
          {zoneOptions(draft).map((z) => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
        <p className="text-xs text-body mt-2">Dates on invoices and reports use this time zone.</p>
        {error && <p role="alert" className="text-sm text-[#b3312c] mt-2">{error}</p>}
        <div className="flex gap-3 mt-3">
          <button type="button" onClick={() => setEditing(false)} className="flex-1 min-h-12 btn-glass btn-glass-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 min-h-12 disabled:opacity-60 btn-glass btn-glass-primary">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    )
  }

  return (
    <button
      type="button"
      className={rowClass}
      disabled={!businessId || !loaded}
      onClick={() => {
        setDraft(current)
        setError(null)
        setEditing(true)
      }}
    >
      <span>
        <span className="block">Time zone</span>
        <span className="block text-xs font-normal text-body mt-0.5">
          {zoneLabel(current)}
          {!saved && loaded ? " (from your device)" : ""}
        </span>
      </span>
      <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}
