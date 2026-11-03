import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Invite = { id: string; email: string; name: string | null; created_at?: string | null; status?: string | null }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AccountantCard({ businessId, isOwner }: { businessId: string | null; isOwner: boolean }) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const { data, error: err } = await supabase
      .from("invites")
      .select("*")
      .eq("business_id", businessId)
      .eq("role", "accountant")
      .order("created_at", { ascending: false })
    if (err) console.error("invites lookup failed", err)
    setInvites((data as Invite[] | null) || [])
    setLoaded(true)
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    const addr = email.trim().toLowerCase()
    if (!EMAIL_RE.test(addr)) {
      setError("Please enter a valid email address.")
      return
    }
    setSaving(true)
    setError(null)
    const { data: auth } = await supabase.auth.getSession()
    const { error: err } = await supabase.from("invites").insert({
      business_id: businessId,
      email: addr,
      name: name.trim() || null,
      role: "accountant",
      invited_by: auth.session?.user.id,
    })
    setSaving(false)
    if (err) {
      console.error("invite failed", err)
      setError("We couldn't save that invite. Please try again.")
      return
    }
    setAdding(false)
    setName("")
    setEmail("")
    load()
  }

  if (!businessId) return null

  return (
    <>
      <div className="mx-5 mt-5 mb-2 text-xs font-bold tracking-wider uppercase text-body">Your accountant</div>
      <div className="mx-5 border border-border rounded-2xl overflow-hidden bg-white">
        {!loaded && <div className="p-4 text-sm text-body">Loading...</div>}
        {loaded && invites.length === 0 && !adding && (
          <div className="p-4">
            <p className="text-[15px] text-body">Give your accountant access so they can review your books.</p>
            {isOwner ? (
              <button type="button" onClick={() => setAdding(true)} className="mt-3 w-full min-h-12 rounded-full bg-brand-blue text-white font-semibold">
                Invite your accountant
              </button>
            ) : (
              <p className="mt-2 text-xs text-body">Only the business owner can invite an accountant.</p>
            )}
          </div>
        )}
        {invites.map((i) => (
          <div key={i.id} className="px-4 py-3 border-t border-border first:border-t-0 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium truncate">{i.name || i.email}</div>
              {i.name && <div className="text-xs text-body truncate">{i.email}</div>}
            </div>
            <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#eef3ff] text-brand-blue-dark text-xs font-semibold">
              {i.status === "accepted" ? "Joined" : "Invited"}
            </span>
          </div>
        ))}
        {loaded && invites.length > 0 && isOwner && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="w-full min-h-12 px-4 text-left text-[15px] font-semibold text-brand-blue border-t border-border">
            Invite another accountant
          </button>
        )}
        {adding && (
          <form onSubmit={invite} className="p-4 border-t border-border first:border-t-0">
            <label htmlFor="acc-name" className="block text-[13px] font-semibold mb-1.5">Accountant's name (optional)</label>
            <input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-4 text-base" />
            <label htmlFor="acc-email" className="block text-[13px] font-semibold mt-3 mb-1.5">Accountant's email</label>
            <input id="acc-email" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-4 text-base" />
            {error && <p role="alert" className="text-sm text-[#b3312c] mt-2">{error}</p>}
            <div className="flex gap-3 mt-3">
              <button type="button" onClick={() => { setAdding(false); setError(null) }} className="flex-1 min-h-12 rounded-full border-[1.5px] border-brand-blue text-brand-blue font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 min-h-12 rounded-full bg-brand-blue text-white font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Save invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
