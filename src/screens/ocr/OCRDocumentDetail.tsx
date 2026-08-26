import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface RiskCheck {
  check: string
  status: "pass" | "warning" | "fail"
  detail: string
}

interface LineItem {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  line_total: number
}

interface ExpenseDetail {
  id: string
  vendor_display: string
  category_name: string | null
  document_date: string | null
  subtotal: number
  tax_total: number
  total: number
  currency: string
  payment_status: string
  risk_checks: RiskCheck[] | null
  risk_score: number | null
  bill_to_name: string | null
  bill_to_address: string | null
  receipt_image_url: string | null
}

const CHECK_LABELS: Record<string, string> = {
  currency_support: "Currency",
  duplicate: "Duplicate check",
  vendor_identity: "Vendor identity",
  date_logic: "Date logic",
  math_consistency: "Math consistency",
  amount_anomaly: "Amount vs. history",
  bill_to_match: "Bill-to match",
  round_amount: "Round amount",
}

export default function OCRDocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadExpense(id)
  }, [id])

  async function loadExpense(expenseId: string) {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from("expenses")
      .select("*, vendors(name), expense_categories(name)")
      .eq("id", expenseId)
      .maybeSingle()

    if (fetchError || !data) {
      setError(fetchError?.message || "Document not found.")
      setLoading(false)
      return
    }

    setExpense({
      id: data.id,
      vendor_display: data.vendors?.name || data.vendor_name || "Unknown vendor",
      category_name: data.expense_categories?.name || null,
      document_date: data.document_date,
      subtotal: data.subtotal,
      tax_total: data.tax_total,
      total: data.total,
      currency: data.currency || "USD",
      payment_status: data.payment_status,
      risk_checks: data.risk_checks,
      risk_score: data.risk_score,
      bill_to_name: data.bill_to_name,
      bill_to_address: data.bill_to_address,
      receipt_image_url: data.receipt_image_url,
    })

    const { data: items } = await supabase
      .from("expense_line_items")
      .select("id, item_name, quantity, unit_price, line_total")
      .eq("expense_id", expenseId)
      .order("sort_order")

    setLineItems(items || [])

    if (data.receipt_image_url) {
      const { data: signed } = await supabase.storage
        .from("receipts")
        .createSignedUrl(data.receipt_image_url, 3600)
      setImageUrl(signed?.signedUrl || null)
    }

    setLoading(false)
  }

  const currencySymbol = expense?.currency === "GBP" ? "\u00A3" : expense?.currency === "EUR" ? "\u20AC" : "$"

  function statusColor(status: string) {
    if (status === "fail") return "text-red-700 bg-red-50 border-red-200"
    if (status === "warning") return "text-amber-700 bg-amber-50 border-amber-200"
    return "text-green-700 bg-green-50 border-green-200"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading document...</p>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-500 text-sm mb-4">{error || "Document not found."}</p>
        <button onClick={() => navigate("/ocr")} className="text-blue-700 text-sm font-semibold">
          Back to documents
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/ocr")} className="text-2xl text-gray-500">&#8592;</button>
        <span className="font-bold text-gray-900 text-sm">Document detail</span>
        <div className="w-6"></div>
      </div>

      <div className="flex justify-between items-start mb-1">
        <h2 className="text-lg font-bold text-gray-900">{expense.vendor_display}</h2>
        <span className="text-lg font-bold text-gray-900">{expense.currency} {currencySymbol}{expense.total?.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400">{expense.document_date || ""}</span>
        {expense.category_name && (
          <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {expense.category_name}
          </span>
        )}
        <span className={`text-xs font-semibold ${expense.payment_status === "paid" ? "text-green-700" : "text-amber-700"}`}>
          {expense.payment_status === "paid" ? "Paid" : "Unpaid"}
        </span>
      </div>

      {expense.risk_score !== null && (
        <div className="border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-500">Risk score</span>
            <span className="text-sm font-bold text-gray-900">{expense.risk_score}%</span>
          </div>
          {(expense.risk_checks || []).map((c, i) => (
            <div key={i} className={`text-xs px-2 py-1.5 rounded-lg border mb-1 ${statusColor(c.status)}`}>
              <p className="font-semibold">{CHECK_LABELS[c.check] || c.check}</p>
              <p>{c.detail}</p>
            </div>
          ))}
        </div>
      )}

      {(expense.bill_to_name || expense.bill_to_address) && (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 mb-4">
          <p className="font-semibold text-gray-500 mb-0.5">Billed to</p>
          {expense.bill_to_name && <p>{expense.bill_to_name}</p>}
          {expense.bill_to_address && <p className="whitespace-pre-line">{expense.bill_to_address}</p>}
        </div>
      )}

      {lineItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Line items</p>
          {lineItems.map((it) => (
            <div key={it.id} className="border border-gray-200 rounded-lg p-3 mb-2">
              <p className="text-sm mb-1">{it.item_name}</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{it.quantity} x {currencySymbol}{it.unit_price?.toFixed(2)}</span>
                <span className="font-semibold text-gray-900">{currencySymbol}{it.line_total?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-200 pt-3 mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Subtotal</span>
          <span>{expense.currency} {currencySymbol}{expense.subtotal?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Tax</span>
          <span>{expense.currency} {currencySymbol}{expense.tax_total?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-gray-900">
          <span>Total</span>
          <span>{expense.currency} {currencySymbol}{expense.total?.toFixed(2)}</span>
        </div>
      </div>

      {imageUrl && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 mb-2">Receipt</p>
          {expense.receipt_image_url?.toLowerCase().endsWith(".pdf") ? (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-50 text-blue-700 rounded-lg py-3 text-sm font-semibold border border-blue-200"
            >
              View receipt (PDF)
            </a>
          ) : (
            <img src={imageUrl} alt="Receipt" className="w-full rounded-lg border border-gray-200" />
          )}
        </div>
      )}
    </div>
  )
}



