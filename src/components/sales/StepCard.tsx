import type { ReactNode } from "react"

export type StepState = "done" | "current" | "pending"
type StepKind = "create" | "send" | "payments"

const TILE: Record<StepState, string> = {
  done: "bg-brand-success-soft text-brand-success",
  current: "bg-[#eef3ff] text-brand-blue",
  pending: "bg-[#f2f2f2] text-muted",
}

const PATHS: Record<StepKind | "check", ReactNode> = {
  create: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />,
  payments: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10.5h18" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
}

export function StepIcon({ kind, state }: { kind: StepKind; state: StepState }) {
  return (
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TILE[state]}`} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={state === "done" ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[state === "done" ? "check" : kind]}
      </svg>
    </span>
  )
}

export function StepCard({ children }: { children: ReactNode }) {
  return <div className="border border-border rounded-2xl p-4 mb-3 bg-white">{children}</div>
}

export function StepTitle({ kind, state, title, action }: { kind: StepKind; state: StepState; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <StepIcon kind={kind} state={state} />
      <span className="font-wordmark font-extrabold text-base">{title}</span>
      {action && <span className="ml-auto">{action}</span>}
      <span className="sr-only">{state === "done" ? "completed" : state === "current" ? "next step" : "not started"}</span>
    </div>
  )
}

export const btnPrimary = "btn-glass btn-glass-primary min-h-10 px-3 text-sm whitespace-nowrap"
export const btnSoft = "btn-glass btn-glass-secondary min-h-10 px-3 text-sm whitespace-nowrap"
export const btnOutline = "btn-glass btn-glass-secondary min-h-10 px-4 text-sm"
export const btnBig = "btn-glass w-full min-h-12 text-base"

export function UpgradeNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 bg-[#eef3ff] rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs text-brand-blue-dark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="min-w-0">{children}</span>
      <span className="ml-auto shrink-0 bg-brand-blue text-white font-semibold px-2.5 py-0.5 rounded-full text-[11px]">Upgrade</span>
    </div>
  )
}

export function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" className="w-10 h-10 -ml-2 flex items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  )
}

export function MoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="More actions" className="w-10 h-10 rounded-xl bg-[#eceffd] text-brand-blue flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
      </svg>
    </button>
  )
}
