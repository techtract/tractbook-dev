import { useNavigate } from "react-router-dom"
import { Wordmark } from "../../components/ui/Wordmark"
import { COMPANY, CONTACT } from "../../config/contact"
import pkg from "../../../package.json"

export default function About() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen max-w-sm mx-auto pb-8">
      <div className="flex items-center gap-1 pt-5 pr-3 pl-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-[22px]">About Tractbook</h1>
      </div>

      <div className="mx-5 mt-4 p-5 rounded-2xl bg-white border border-border">
        <Wordmark variant="dark" />
        <p className="mt-4 text-[15px] text-body">
          Tractbook is accounting software built for Canadian small businesses. Send estimates and invoices, scan
          receipts, and keep your books ready for your accountant.
        </p>
        <dl className="mt-5 text-sm space-y-2">
          <div className="flex justify-between"><dt className="text-body">Version</dt><dd className="font-medium">{pkg.version}</dd></div>
          <div className="flex justify-between"><dt className="text-body">Made by</dt><dd className="font-medium">{COMPANY.legalName}</dd></div>
          <div className="flex justify-between"><dt className="text-body">Based in</dt><dd className="font-medium">{COMPANY.location}</dd></div>
          <div className="flex justify-between"><dt className="text-body">Website</dt>
            <dd className="font-medium"><a className="text-brand-blue underline" href={COMPANY.website} target="_blank" rel="noopener noreferrer">tractbook.com</a></dd>
          </div>
          <div className="flex justify-between"><dt className="text-body">Support</dt>
            <dd className="font-medium"><a className="text-brand-blue underline" href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a></dd>
          </div>
        </dl>
      </div>

      <p className="mx-5 mt-4 text-xs text-body">
        &copy; {new Date().getFullYear()} {COMPANY.legalName}. Tractbook is an accounting tool and does not
        replace advice from a qualified accountant or tax professional.
      </p>
    </div>
  )
}
