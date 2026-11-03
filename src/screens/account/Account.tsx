import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAccount } from "../../hooks/useAccount"
import TimeZoneRow from "../../components/account/TimeZoneRow"
import AccountantCard from "../../components/account/AccountantCard"
import pkg from "../../../package.json"

type Tab = "business" | "general"

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  accountant: "Accountant",
  admin: "Admin",
  member: "Team member",
}

const COUNTRY_LABEL: Record<string, string> = { CA: "Canada", US: "United States" }

function Chevron() {
  return (
    <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

const rowClass =
  "w-full min-h-14 px-4 flex items-center gap-3 text-left text-[15px] font-medium bg-white border-t border-border first:border-t-0"

export default function Account() {
  const navigate = useNavigate()
  const location = useLocation()
  const acct = useAccount()
  const [tab, setTab] = useState<Tab>("business")
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [showVersion, setShowVersion] = useState(false)

  const roleLabel = ROLE_LABEL[acct.role] || (acct.role ? acct.role : "")
  const countryLabel = COUNTRY_LABEL[acct.country] || acct.country

  function startEdit() {
    setNameDraft(acct.hasName ? acct.fullName : "")
    setError(null)
    setEditing(true)
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    const name = nameDraft.trim()
    if (!name) {
      setError("Please enter your name.")
      return
    }
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: name } })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(false)
    acct.reload()
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="h-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="flex items-center gap-1 pt-5 pr-3 pl-2">
          <button type="button" onClick={() => navigate(((location.state as { from?: string } | null)?.from) || "/dashboard")} aria-label="Back" className="w-11 h-11 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <h1 className="text-[22px]">Account</h1>
        </div>

        <div className="mx-5 mt-2 p-[18px] rounded-2xl bg-white border border-brand-blue-light flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-brand-blue text-white font-semibold text-xl flex items-center justify-center shrink-0">
            {acct.initials}
          </div>
          <div className="min-w-0 flex-1">
            {acct.loading && <div className="text-sm text-body">Loading your details...</div>}
            {acct.failed && (
              <div role="alert" className="text-sm text-body">
                Couldn't load your details.{" "}
                <button type="button" onClick={acct.reload} className="font-semibold text-brand-blue underline">Try again</button>
              </div>
            )}
            <div className="font-wordmark font-extrabold text-lg truncate">{acct.hasName ? acct.fullName : acct.email}</div>
            {!acct.hasName && !acct.loading && (
              <button type="button" onClick={() => { setTab("general"); startEdit() }} className="text-[13px] font-semibold text-brand-blue underline mt-0.5">
                Add your full name
              </button>
            )}
            {acct.hasName && <div className="text-[13px] text-body truncate">{acct.email}</div>}
            {roleLabel && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#eef3ff] text-brand-blue-dark text-xs font-semibold">
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        <div role="tablist" className="mx-5 mt-4 p-1 rounded-full bg-[#eceffd] flex">
          {(["business", "general"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 h-10 rounded-full text-sm font-semibold ${tab === t ? "bg-brand-blue text-white" : "text-brand-blue"}`}
            >
              {t === "business" ? "Business" : "General"}
            </button>
          ))}
        </div>

        {tab === "business" && (
          <>
            <div className="mx-5 mt-5 mb-2 text-xs font-bold tracking-wider uppercase text-body">Your business</div>
            <div className="mx-5 border border-border rounded-2xl overflow-hidden bg-white">
              <button type="button" className={rowClass} onClick={() => navigate("/business")}>
                <span>
                  <span className="block">{acct.businessName || "Your business"}</span>
                  {countryLabel && <span className="block text-xs font-normal text-body mt-0.5">{countryLabel}</span>}
                </span>
                <Chevron />
              </button>
              <button type="button" className={rowClass} onClick={() => navigate("/business")}>
                <span>
                  <span className="block">Online payments</span>
                  <span className="block text-xs font-normal text-body mt-0.5">Accept card payments with Stripe</span>
                </span>
                <Chevron />
              </button>
              <button type="button" className={rowClass} onClick={() => navigate("/customers")}>
                <span>Customers</span>
                <Chevron />
              </button>
              <TimeZoneRow businessId={acct.businessId} />
            </div>

            <AccountantCard businessId={acct.businessId} isOwner={acct.role === "owner"} />

            <div className="mx-5 mt-5 mb-2 text-xs font-bold tracking-wider uppercase text-body">Coming soon</div>
            <div className="mx-5 border border-border rounded-2xl overflow-hidden bg-[#fafafa]">
              {["Sales taxes", "Invoice & estimate style", "Team & access"].map((label) => (
                <div key={label} className={`${rowClass} !bg-[#fafafa] text-body`}>
                  <span>{label}</span>
                  <span className="ml-auto text-xs font-semibold bg-[#eceffd] rounded-full px-2.5 py-0.5">Soon</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "general" && (
          <>
            <div className="mx-5 mt-5 mb-2 text-xs font-bold tracking-wider uppercase text-body">Your profile</div>
            <div className="mx-5 border border-border rounded-2xl overflow-hidden bg-white">
              {editing ? (
                <form onSubmit={saveName} className="p-4">
                  <label htmlFor="acct-name" className="block text-[13px] font-semibold mb-1.5">Your name</label>
                  <input
                    id="acct-name"
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="w-full h-13 min-h-[52px] rounded-xl border-[1.5px] border-brand-blue-light px-4 text-base"
                  />
                  {error && <p role="alert" className="text-sm text-[#b3312c] mt-2">{error}</p>}
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={() => setEditing(false)} className="flex-1 min-h-12 rounded-full border-[1.5px] border-brand-blue text-brand-blue font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 min-h-12 rounded-full bg-brand-blue text-white font-semibold disabled:opacity-60">
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className={rowClass} onClick={startEdit}>
                  <span>Name</span>
                  <span className="ml-auto text-sm font-normal text-body truncate max-w-[180px]">
                    {acct.hasName ? acct.fullName : "Add your name"}
                  </span>
                  <Chevron />
                </button>
              )}
              <div className={rowClass}>
                <span>Email</span>
                <span className="ml-auto text-sm font-normal text-body truncate max-w-[200px]">{acct.email}</span>
              </div>
              {roleLabel && (
                <div className={rowClass}>
                  <span>Role</span>
                  <span className="ml-auto text-sm font-normal text-body">{roleLabel}</span>
                </div>
              )}
            </div>

            <div className="mx-5 mt-5 mb-2 text-xs font-bold tracking-wider uppercase text-body">Security</div>
            <div className="mx-5 border border-border rounded-2xl overflow-hidden bg-white">
              <button type="button" className={rowClass} onClick={() => navigate("/account/security")}>
                <span>Password, two-step verification and devices</span>
                <Chevron />
              </button>
            </div>

            <div className="mx-5 mt-5 mb-2 text-xs font-bold tracking-wider uppercase text-body">Help &amp; legal</div>
            <div className="mx-5 border border-border rounded-2xl overflow-hidden bg-white">
              {([
                ["support", "Help & support"],
                ["issue", "Report an issue"],
                ["suggestion", "Share your suggestion"],
              ] as const).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  className={rowClass}
                  onClick={() => navigate(`/account/feedback?type=${kind}`, { state: { from: location.pathname } })}
                >
                  <span>{label}</span>
                  <Chevron />
                </button>
              ))}
              <button type="button" className={rowClass} onClick={() => navigate("/account/about")}>
                <span>About Tractbook</span>
                <Chevron />
              </button>
              <button type="button" className={rowClass} onClick={() => navigate("/account/legal")}>
                <span>Terms and policies</span>
                <Chevron />
              </button>
              <div className={rowClass}>
                <span>App version</span>
                <button
                  type="button"
                  aria-label="About this version"
                  aria-expanded={showVersion}
                  onClick={() => setShowVersion((v) => !v)}
                  className="w-6 h-6 rounded-full border border-body text-body text-xs font-bold flex items-center justify-center"
                >
                  i
                </button>
                <span className="ml-auto text-sm font-normal text-body">{pkg.version}</span>
              </div>
              {showVersion && (
                <div className="px-4 py-3 text-[13px] text-body bg-[#fafafa] border-t border-border">
                  You are on Tractbook version {pkg.version}. If something looks wrong, tell us this number when you
                  report an issue. Updates arrive automatically, so you always have the latest version.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-6 pt-2 shrink-0">
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="w-full min-h-[52px] rounded-full border-[1.5px] border-brand-error bg-white text-[#b3312c] font-semibold text-base disabled:opacity-60"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  )
}
