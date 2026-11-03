import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import StepProgress from "./StepProgress"

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
  const location = useLocation()
  const priorState = (location.state as Record<string, unknown>) || {}

  const [bookkeeping, setBookkeeping] = useState("")
  const [goal, setGoal] = useState("")
  const [teamSize, setTeamSize] = useState("")

  const canSubmit = bookkeeping !== "" && goal !== "" && teamSize !== ""

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    navigate("/invite-accountant", {
      state: { ...priorState, bookkeeping, goal, teamSize },
    })
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <StepProgress current={5} total={6} />
      <h1 className="text-2xl font-bold mb-1">More About Your Business</h1>
      <p className="text-gray-500 text-sm mb-6">Tell us about you and your business</p>

      <form onSubmit={handleNext} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            How are you managing your books right now?
          </label>
          <div className="space-y-2">
            {BOOKKEEPING_METHODS.map((method) => (
              <label key={method} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="bookkeeping"
                  checked={bookkeeping === method}
                  onChange={() => setBookkeeping(method)}
                />
                {method}
              </label>
            ))}
          </div>
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
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`text-sm rounded-full px-3 py-1.5 border ${
                  goal === g
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-gray-700 border-blue-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {goal && (
            <p className="text-xs bg-brand-success-soft border border-brand-success-line rounded-lg px-3 py-2 mt-2 flex gap-2">
              <span>✨</span>
              <span>Klara will prioritise features based on this.</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">How big is your team?</label>
          <div className="flex gap-2">
            {TEAM_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTeamSize(size)}
                className={`text-sm rounded-full px-3 py-1.5 border ${
                  teamSize === size
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-gray-700 border-blue-300"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
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
