import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/BottomNav"
import AppHeader from "../../components/AppHeader"
import { useAccount } from "../../hooks/useAccount"

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

  const account = useAccount()
  const fullName =
    [state.firstName, state.lastName].filter(Boolean).join(" ") ||
    account.fullName ||
    state.email?.split("@")[0] ||
    ""

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
  }

  const totalInvoices = paidCount + unpaidCount
  const paidPct = totalInvoices > 0 ? (paidCount / totalInvoices) * 100 : 0
  const unpaidPct = totalInvoices > 0 ? (unpaidCount / totalInvoices) * 100 : 0

  return (
    <div className="h-screen bg-white flex flex-col max-w-sm mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6">
        <AppHeader />

        {/* Greeting */}
        <h1 className="text-2xl font-bold mb-1">
          {greeting}{fullName ? `, ${fullName}` : ""} !
        </h1>
        <p className="text-gray-500 text-sm mb-6">{subtext}</p>

        {/* Setup progress card */}
        <button className="w-full bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-900">Set up your account</p>
              <p className="text-sm text-gray-500">Next: Get paid faster</p>
            </div>
            <span className="text-gray-400">&#8250;</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: "60%" }} />
          </div>
        </button>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => navigate("/estimates")}
            className="bg-blue-50 rounded-xl py-5 flex flex-col items-center gap-2"
          >
            <span className="text-blue-600 text-2xl">+</span>
            <span className="text-blue-700 font-semibold text-sm">Create new...</span>
          </button>
          <button
            onClick={() => navigate("/ocr/scan")}
            className="bg-purple-50 rounded-xl py-5 flex flex-col items-center gap-2"
          >
            <span className="text-purple-600 text-2xl">&#128247;</span>
            <span className="text-purple-700 font-semibold text-sm">Scan receipt</span>
          </button>
        </div>

        {/* Business at a glance */}
        <h2 className="font-semibold text-gray-900 mb-3">Business at a glance</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="border border-gray-200 rounded-xl p-4">
            <span className="text-gray-400 text-lg">&#128247;</span>
            <p className="text-sm text-gray-500 mt-3">Documents scanned</p>
            <p className="text-lg font-bold text-gray-900">{scannedCount}</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <span className="text-gray-400 text-lg">&#128196;</span>
            <p className="text-sm text-gray-500 mt-3">Total invoices</p>
            <p className="text-lg font-bold text-gray-900">{totalInvoices}</p>
          </div>
        </div>

        {/* Invoice payment status */}
        <h2 className="font-semibold text-gray-900 mb-1">Invoice status</h2>
        <p className="text-sm text-gray-500 mb-3">Paid vs. unpaid invoices.</p>
        {totalInvoices === 0 ? (
          <p className="text-sm text-gray-400 mb-8">No invoices yet.</p>
        ) : (
          <div className="mb-8 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-green-700">Paid</span>
                <span className="text-gray-500">{paidCount}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600">Unpaid</span>
                <span className="text-gray-500">{unpaidCount}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 rounded-full" style={{ width: `${unpaidPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Profit & loss */}
        <h2 className="font-semibold text-gray-900 mb-1">Profit &amp; loss</h2>
        <p className="text-sm text-gray-500 mb-3">
          Income and expenses from the past 12 months.
        </p>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Income
          </span>
          <span className="flex items-center gap-1 text-purple-600">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Expense
          </span>
        </div>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}






