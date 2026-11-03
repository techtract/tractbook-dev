import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"
import AppHeader from "../../components/AppHeader"
import { useAccount } from "../../hooks/useAccount"
import { getSetupProgress, type SetupFacts } from "../../lib/setupProgress"

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function Chevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

interface DashboardState {
  businessId?: string
  businessName?: string
  firstName?: string
  lastName?: string
  email?: string
  justCreated?: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as DashboardState) || {}

  const [scannedCount, setScannedCount] = useState<number>(0)
  const [paidCount, setPaidCount] = useState<number>(0)
  const [unpaidCount, setUnpaidCount] = useState<number>(0)
  const [setupFacts, setSetupFacts] = useState<SetupFacts | null>(null)

  const account = useAccount()
  // Only greet by name when we really have one. The email prefix ("hr", "info") is not a name.
  const fullName =
    [state.firstName, state.lastName].filter(Boolean).join(" ") ||
    (account.hasName ? account.fullName : "")

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const subtextOptions = [
    "Here's what you need to know today.",
    "Snap a receipt the moment you get it - future you will thank you.",
    "Let's get your books in shape.",
    "A few minutes today saves hours later.",
    "Ready when you are.",
    "Stay ahead of tax season, one receipt at a time.",
    "Small updates now, smooth reports later.",
    "Your numbers, sorted.",
  ]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const subtext = subtextOptions[dayOfYear % subtextOptions.length]


  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!membership) return

    const { count: expenseCount } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("business_id", membership.business_id)

    setScannedCount(expenseCount || 0)

    const { data: invoices } = await supabase
      .from("invoices")
      .select("status")
      .eq("business_id", membership.business_id)

    let paid = 0
    let unpaid = 0
    for (const inv of invoices || []) {
      if (inv.status === "paid") paid += 1
      else unpaid += 1
    }
    setPaidCount(paid)
    setUnpaidCount(unpaid)

    const [{ count: customerCount }, { count: estimateCount }, { data: biz }] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", membership.business_id),
      supabase.from("estimates").select("id", { count: "exact", head: true }).eq("business_id", membership.business_id),
      supabase.from("businesses").select("stripe_account_id").eq("id", membership.business_id).maybeSingle(),
    ])
    setSetupFacts({
      customers: customerCount || 0,
      documents: (estimateCount || 0) + (invoices?.length || 0),
      receipts: expenseCount || 0,
      paymentsConnected: !!biz?.stripe_account_id,
    })
  }

  const setup = setupFacts ? getSetupProgress(setupFacts) : null
  const totalInvoices = paidCount + unpaidCount
  const paidPct = totalInvoices > 0 ? (paidCount / totalInvoices) * 100 : 0
  const unpaidPct = totalInvoices > 0 ? (unpaidCount / totalInvoices) * 100 : 0

  return (
    <div className="h-screen glass-screen flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        <AppHeader />

        {/* Greeting */}
        <h1 className="text-2xl font-bold mb-1">
          {greeting}{fullName ? `, ${fullName.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-body text-sm mb-6">{subtext}</p>

        {/* Setup progress card: only while setup is unfinished */}
        {setup && !setup.complete && setup.next && (
          <button
            type="button"
            onClick={() => navigate(setup.next!.path)}
            className="w-full bg-[#fff4e8] border border-[#f6dfc4] rounded-2xl p-4 mb-6 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-ink">Set up your account</p>
                <p className="text-sm text-body">
                  {setup.percent}% complete &middot; Next: {setup.next.label}
                </p>
              </div>
              <Chevron />
            </div>
            <div
              role="progressbar"
              aria-label="Account setup progress"
              aria-valuenow={setup.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden"
            >
              <div className="h-full bg-brand-success rounded-full" style={{ width: `${setup.percent}%` }} />
            </div>
          </button>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => navigate("/estimates")}
            className="bg-[#eef3ff] rounded-2xl py-5 flex flex-col items-center gap-2"
          >
            <span className="text-brand-blue"><Svg><path d="M12 5v14M5 12h14" /></Svg></span>
            <span className="text-brand-blue-dark font-semibold text-sm">Create new...</span>
          </button>
          <button
            onClick={() => navigate("/ocr/scan")}
            className="bg-[#f6f1fe] rounded-2xl py-5 flex flex-col items-center gap-2"
          >
            <span className="text-[#6b21c8]"><Svg><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg></span>
            <span className="text-[#6b21c8] font-semibold text-sm">Scan receipt</span>
          </button>
        </div>

        {/* Business at a glance */}
        <h2 className="text-lg mb-3">Business at a glance</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="border border-border rounded-2xl p-4">
            <span className="text-brand-blue"><Svg><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" /></Svg></span>
            <p className="text-sm text-body mt-3">Documents scanned</p>
            <p className="text-lg font-bold text-gray-900">{scannedCount}</p>
          </div>
          <div className="border border-border rounded-2xl p-4">
            <span className="text-brand-blue"><Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Svg></span>
            <p className="text-sm text-body mt-3">Total invoices</p>
            <p className="text-lg font-bold text-gray-900">{totalInvoices}</p>
          </div>
        </div>

        {/* Invoice payment status */}
        <h2 className="text-lg mb-1">Invoice status</h2>
        <p className="text-sm text-body mb-3">Paid vs. unpaid invoices.</p>
        {totalInvoices === 0 ? (
          <div className="mb-8">
            <p className="text-sm text-body mb-3">No invoices yet.</p>
            <button
              type="button"
              onClick={() => navigate("/invoices/new")}
              className="min-h-11 px-5 text-sm btn-glass btn-glass-secondary"
            >
              Create your first invoice
            </button>
          </div>
        ) : (
          <div className="mb-8 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-brand-success-dark">Paid</span>
                <span className="text-body">{paidCount}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-success rounded-full" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-body">Unpaid</span>
                <span className="text-body">{unpaidCount}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#9ca3af] rounded-full" style={{ width: `${unpaidPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Profit & loss is hidden until the real chart is built (it was only a legend with no data) */}
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}






