import { useNavigate } from "react-router-dom"
import { CONTACT, LEGAL_LINKS } from "../../config/contact"

export default function Legal() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen max-w-sm mx-auto pb-8">
      <div className="flex items-center gap-1 pt-5 pr-3 pl-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-[22px]">Terms and policies</h1>
      </div>

      <div className="mx-5 mt-4 border border-border rounded-2xl overflow-hidden bg-white">
        {LEGAL_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-14 px-4 flex items-center gap-3 text-[15px] font-medium border-t border-border first:border-t-0"
          >
            <span>{l.label}</span>
            <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        ))}
      </div>

      <p className="mx-5 mt-4 text-sm text-body">
        Questions about privacy? Write to{" "}
        <a className="text-brand-blue underline" href={`mailto:${CONTACT.privacy}`}>{CONTACT.privacy}</a>. For legal
        matters, <a className="text-brand-blue underline" href={`mailto:${CONTACT.legal}`}>{CONTACT.legal}</a>.
      </p>
    </div>
  )
}
