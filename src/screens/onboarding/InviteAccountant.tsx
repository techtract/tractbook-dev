import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import StepProgress from "./StepProgress"
import { useOnboardingDraft } from "../../hooks/useOnboardingDraft"
import { buildBusinessArgs, clearDraft, isValidEmail } from "../../lib/onboardingDraft"

export default function InviteAccountant() {
  const navigate = useNavigate()
  const [draft, update] = useOnboardingDraft()

  const choice = draft.accountantChoice ?? ""
  const accountantEmail = draft.accountantEmail ?? ""
  const accountantName = draft.accountantName ?? ""
  const inviteSaved = draft.inviteSaved ?? false
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const canContinue =
    choice === "no" ||
    choice === "self" ||
    (choice === "yes" && inviteSaved)

  function handleSendInvite() {
    if (!isValidEmail(accountantEmail)) {
      setEmailError("Enter a valid email address, like accountant@firm.ca")
      return
    }
    setEmailError(null)
    update({ inviteSaved: true })
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canContinue || saving) return
    setSaving(true)
    setError(null)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      setError("You must be signed in to continue.")
      setSaving(false)
      return
    }

    // One database call creates the business, makes this person its owner and saves the invite,
    // all or nothing, so a failure never leaves a half-made business behind.
    const { data: created, error: createError } = await supabase.rpc(
      "create_business_with_owner",
      buildBusinessArgs(draft)
    )
    if (createError || !created) {
      console.error("create_business_with_owner failed", createError)
      setError("We couldn't finish setting up your business. Please try again.")
      setSaving(false)
      return
    }
    const result = created as { business_id: string; business_name: string }

    // Remember the person's name on their account so it shows on every login, not just this session
    const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim()
    if (fullName) {
      await supabase.auth.updateUser({ data: { full_name: fullName } })
    }

    clearDraft()
    setSaving(false)
    navigate("/dashboard", {
      state: {
        businessId: result.business_id,
        businessName: result.business_name,
        firstName: draft.firstName,
        justCreated: true,
      },
    })
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={6} total={6} />
      <h1 className="text-2xl font-bold mb-1">Invite your Accountant</h1>
      <p className="text-gray-500 text-sm mb-6">Your accountant can review your books without seeing everything.</p>

      <div className="bg-brand-success-soft border border-brand-success-line rounded-lg p-3 mb-4 text-sm text-brand-success-dark">
        Your accountant gets their own view - they see compliance, journal entries and CRA status. You see your business growth view. Same data, different lens.
      </div>

      <form onSubmit={handleNext} className="space-y-3">
        <label
          className={`block border rounded-lg p-3 cursor-pointer ${
            choice === "yes" ? "border-blue-600 bg-blue-50" : "border-gray-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <input
              type="radio"
              name="accountant-choice"
              checked={choice === "yes"}
              onChange={() => update({ accountantChoice: "yes" })}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-sm">Yes - invite my accountant now</p>
              <p className="text-xs text-gray-500">
                They'll get an email invite to join your Tractbook workspace
              </p>
            </div>
          </div>
        </label>

        {choice === "yes" && (
          <div className="pl-2 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Accountant's mail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={accountantEmail}
                onChange={(e) => {
                  update({ accountantEmail: e.target.value, inviteSaved: false })
                  setEmailError(null)
                }}
                placeholder="accountant@firm.ca"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Accountant's name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={accountantName}
                onChange={(e) => update({ accountantName: e.target.value })}
                placeholder="e.g. Foram Shah"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="button"
              onClick={handleSendInvite}
              disabled={!accountantEmail.trim() || inviteSaved}
              className="w-full btn-glass btn-glass-success"
            >
              {inviteSaved ? "Invite saved" : "Save invite"}
            </button>
            {emailError && <p className="text-red-500 text-xs">{emailError}</p>}
            {inviteSaved && (
              <p className="text-brand-success-dark text-xs">
                Invite saved for {accountantEmail.trim()}. Tap Next to finish setup.
              </p>
            )}
          </div>
        )}

        <label
          className={`block border rounded-lg p-3 cursor-pointer ${
            choice === "no" ? "border-blue-600 bg-blue-50" : "border-gray-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <input
              type="radio"
              name="accountant-choice"
              checked={choice === "no"}
              onChange={() => update({ accountantChoice: "no" })}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-sm">No - I manage my own books</p>
              <p className="text-xs text-gray-500">You can invite an accountant any time from Settings.</p>
            </div>
          </div>
        </label>

        <label
          className={`block border rounded-lg p-3 cursor-pointer ${
            choice === "self" ? "border-blue-600 bg-blue-50" : "border-gray-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <input
              type="radio"
              name="accountant-choice"
              checked={choice === "self"}
              onChange={() => update({ accountantChoice: "self" })}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-sm">I am the accountant</p>
              <p className="text-xs text-gray-500">You'll be setting up this workspace for a client.</p>
            </div>
          </div>
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-300 text-gray-600 rounded-lg py-3 font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!canContinue || saving}
            className="flex-1 btn-glass btn-glass-primary"
          >
            {saving ? "Setting up..." : "Next"}
          </button>
        </div>
      </form>
    </div>
  )
}


