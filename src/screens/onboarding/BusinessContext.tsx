import { useNavigate } from "react-router-dom"
import StepProgress from "./StepProgress"
import OptionChips from "../../components/ui/OptionChips"
import { useOnboardingDraft } from "../../hooks/useOnboardingDraft"

const BOOKKEEPING_METHODS = [
  "Excel / Googlesheets - manual",
  "QuickBooks or Xero",
  "Wave",
  "Nothing yet - starting fresh",
]

const GOALS = [
  "Get Paid faster",
  "Manage expenses",
  "File taxes easier",
  "Replace my current software",
  "All of the above",
]

const TEAM_SIZES = ["Just me", "2 - 5", "6 - 20", "20+"]

export default function BusinessContext() {
  const navigate = useNavigate()
  const [draft, update] = useOnboardingDraft()

  const bookkeeping = draft.bookkeeping ?? ""
  const goal = draft.goal ?? ""
  const teamSize = draft.teamSize ?? ""

  const canSubmit = bookkeeping !== "" && goal !== "" && teamSize !== ""

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    navigate("/invite-accountant")
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={5} total={6} />
      <h1 className="text-2xl font-bold mb-1">More About Your Business</h1>
      <p className="text-gray-500 text-sm mb-6">Three quick questions so Klara can tailor Tractbook to you.</p>

      <form onSubmit={handleNext} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            How are you managing your books right now?
          </label>
          <OptionChips
            label="How you manage your books"
            options={BOOKKEEPING_METHODS}
            value={bookkeeping}
            onChange={(v) => update({ bookkeeping: v })}
          />
          {bookkeeping && (
            <p className="text-xs bg-brand-success-soft border border-brand-success-line rounded-lg px-3 py-2 mt-2 flex gap-2">
              <span>✨</span>
              <span>Klara will help you migrate or start clean based on this.</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            What's your main goal with Tractbook?
          </label>
          <OptionChips label="Main goal" options={GOALS} value={goal} onChange={(v) => update({ goal: v })} />
          {goal && (
            <p className="text-xs bg-brand-success-soft border border-brand-success-line rounded-lg px-3 py-2 mt-2 flex gap-2">
              <span>✨</span>
              <span>Klara will prioritise features based on this.</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">How big is your team?</label>
          <OptionChips label="Team size" options={TEAM_SIZES} value={teamSize} onChange={(v) => update({ teamSize: v })} />
          {teamSize && (
            <p className="text-xs bg-brand-success-soft border border-brand-success-line rounded-lg px-3 py-2 mt-2">
              Determines team collaboration and user seat features.
            </p>
          )}
        </div>

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
            disabled={!canSubmit}
            className="flex-1 btn-glass btn-glass-primary"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  )
}
