import { useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAccount } from "../../hooks/useAccount"
import { CONTACT } from "../../config/contact"
import pkg from "../../../package.json"

export type FeedbackKind = "suggestion" | "issue" | "support"

const COPY: Record<FeedbackKind, { title: string; intro: string; label: string; placeholder: string; button: string; thanks: string }> = {
  suggestion: {
    title: "Share your suggestion",
    intro: "Got an idea you'd love to see in Tractbook, or a better way to get work done? Tell us below.",
    label: "Your suggestion",
    placeholder: "Type your idea here...",
    button: "Send suggestion",
    thanks: "Thank you! Your suggestion is with the team.",
  },
  issue: {
    title: "Report an issue",
    intro: "Something not working? Tell us what you did and what went wrong. We add your app version and screen automatically.",
    label: "What went wrong?",
    placeholder: "Describe the problem...",
    button: "Send report",
    thanks: "Thank you! We got your report and will look into it.",
  },
  support: {
    title: "Help & support",
    intro: "Need a hand? Ask your question and our team will reply to your account email.",
    label: "How can we help?",
    placeholder: "Type your question here...",
    button: "Send to support",
    thanks: "Thank you! We will reply to your account email soon.",
  },
}

function parseKind(v: string | null): FeedbackKind {
  return v === "issue" || v === "support" ? v : "suggestion"
}

export default function Feedback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const kind = parseKind(params.get("type"))
  const copy = COPY[kind]
  const acct = useAccount()
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = message.trim()
    if (text.length < 3) {
      setError("Please write a little more so we can understand.")
      return
    }
    setSending(true)
    setError(null)
    const from = (location.state as { from?: string } | null)?.from || "/account"
    const { error: insertError } = await supabase.from("feedback").insert({
      kind,
      message: text,
      business_id: acct.businessId,
      email: acct.email || null,
      app_version: pkg.version,
      page: from,
      user_agent: navigator.userAgent,
    })
    setSending(false)
    if (insertError) {
      console.error("feedback insert failed", insertError)
      setError(`We couldn't send that. Please try again, or email ${CONTACT.support}.`)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen max-w-sm mx-auto pb-8">
      <div className="flex items-center gap-1 pt-5 pr-3 pl-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-[22px]">{copy.title}</h1>
      </div>

      {sent ? (
        <div className="mx-5 mt-6 p-5 rounded-2xl border border-brand-success bg-white" role="status">
          <div className="font-wordmark font-extrabold text-lg text-brand-success-dark">Sent</div>
          <p className="mt-1 text-[15px] text-body">{copy.thanks}</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-4 w-full min-h-[52px] rounded-full bg-brand-blue text-white font-semibold">
            Back to account
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mx-5 mt-4">
          <p className="text-[15px] text-body">{copy.intro}</p>
          <label htmlFor="fb-msg" className="block text-[13px] font-semibold mt-5 mb-1.5">{copy.label}</label>
          <textarea
            id="fb-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={4000}
            rows={7}
            placeholder={copy.placeholder}
            className="w-full rounded-xl border-[1.5px] border-brand-blue-light p-4 text-base resize-none bg-white"
          />
          {error && <p role="alert" className="text-sm text-[#b3312c] mt-2">{error}</p>}
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="mt-4 w-full min-h-[52px] rounded-full bg-brand-blue text-white font-semibold disabled:opacity-60"
          >
            {sending ? "Sending..." : copy.button}
          </button>
          <p className="mt-4 text-xs text-body">
            Prefer email? Write to{" "}
            <a className="text-brand-blue underline" href={`mailto:${kind === "suggestion" ? CONTACT.feedback : CONTACT.support}`}>
              {kind === "suggestion" ? CONTACT.feedback : CONTACT.support}
            </a>
            .
          </p>
        </form>
      )}
    </div>
  )
}
