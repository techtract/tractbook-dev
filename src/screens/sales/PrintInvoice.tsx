import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Wordmark } from "../../components/ui/Wordmark"
import { supabase } from "../../lib/supabase"
import { formatGstHst } from "../../lib/taxNumber"

const CANADA_TAX_RATES: Record<string, { label: string; rate: number }> = {
  Ontario: { label: "HST 13%", rate: 13 },
  "British Columbia": { label: "GST 5% + PST 7%", rate: 12 },
  Alberta: { label: "GST 5%", rate: 5 },
  Saskatchewan: { label: "GST 5% + PST 6%", rate: 11 },
  Manitoba: { label: "GST 5% + PST 7%", rate: 12 },
  Quebec: { label: "GST 5% + QST 9.975%", rate: 14.975 },
  "Nova Scotia": { label: "HST 15%", rate: 15 },
  "New Brunswick": { label: "HST 15%", rate: 15 },
  "Newfoundland and Labrador": { label: "HST 15%", rate: 15 },
  "Prince Edward Island": { label: "HST 15%", rate: 15 },
  "Northwest Territories": { label: "GST 5%", rate: 5 },
  Yukon: { label: "GST 5%", rate: 5 },
  Nunavut: { label: "GST 5%", rate: 5 },
}

export type PrintInvoiceData = {
  document: any
  customer: any
  business: any
  items: any[]
  paidTotal?: number
}

// Pass `data` to render a document that was already fetched (the public view page).
export default function PrintInvoice({ data }: { data?: PrintInvoiceData } = {}) {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [business, setBusiness] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [paidTotal, setPaidTotal] = useState(0)
  useEffect(() => {
    if (data) {
      setInvoice(data.document)
      setCustomer(data.customer)
      setBusiness(data.business)
      setItems(data.items)
      setPaidTotal(data.paidTotal || 0)
      return
    }
    load()
  }, [id, data])
  async function load() {
    if (!id) return
    const { data: inv } = await supabase.from("invoices").select("*, customers(*)").eq("id", id).maybeSingle()
    if (!inv) return
    setInvoice(inv)
    setCustomer(inv.customers)
    const { data: biz } = await supabase.from("businesses").select("*").eq("id", inv.business_id).maybeSingle()
    setBusiness(biz)
    const { data: lineItems } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("sort_order")
    setItems(lineItems || [])
    const { data: payments } = await supabase.from("payments").select("amount").eq("invoice_id", id)
    const sum = (payments || []).reduce((s, p) => s + Number(p.amount), 0)
    setPaidTotal(sum)
  }
  if (!invoice) return <p style={{ padding: 40 }}>Loading...</p>

  const isDraft = !invoice.sent_at && invoice.status !== "sent" && invoice.status !== "paid" && invoice.status !== "void"
  const amountDue = Number(invoice.total) - paidTotal

  const provincePreset = business?.country === "CA" && business?.region ? CANADA_TAX_RATES[business.region] : null
  const taxLabel =
    Number(invoice.tax_total) > 0 && provincePreset && Math.abs(provincePreset.rate - (Number(invoice.subtotal) > 0 ? (Number(invoice.tax_total) / Number(invoice.subtotal)) * 100 : 0)) < 0.5
      ? provincePreset.label
      : "Tax"

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "'Segoe UI', 'Nunito Sans', sans-serif", padding: 24, position: "relative", overflow: "hidden" }}>
      {isDraft && (
        <div
          className="no-print-keep"
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: 90,
            fontWeight: 800,
            color: "rgba(220, 38, 38, 0.18)",
            letterSpacing: 8,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          DRAFT
        </div>
      )}
      {invoice.status === "void" && (
        <div
          className="no-print-keep"
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: 90,
            fontWeight: 800,
            color: "rgba(107, 114, 128, 0.25)",
            letterSpacing: 8,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          VOID
        </div>
      )}
      {invoice.status === "paid" && (
        <div
          className="no-print-keep"
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: 90,
            fontWeight: 800,
            color: "rgba(22, 163, 74, 0.18)",
            letterSpacing: 8,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          PAID
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          {business?.logo_url && (
            <img src={business.logo_url} alt="" style={{ maxHeight: 64, maxWidth: 180, objectFit: "contain" }} />
          )}
        </div>
        <div style={{ textAlign: "right" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>INVOICE</h1>
        <p style={{ fontSize: 13, color: "#555" }}>
          <b>{business?.name}</b><br />
          {business?.street1}<br />
          {business?.city}, {business?.region}<br />
          {business?.country === "CA" ? "Canada" : "United States"}
          {business?.phone && <><br />Phone: {business.phone}</>}
          {business?.tax_registration_number && <><br />GST/HST No. {formatGstHst(business.tax_registration_number)}</>}
        </p>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>BILL TO</p>
          <p style={{ fontSize: 14 }}>
            <b>{[customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || customer?.name}</b><br />
            {customer?.company_name && <>{customer.company_name}<br /></>}
            {customer?.billing_address?.street1 && <>{customer.billing_address.street1}<br /></>}
            {customer?.billing_address?.street2 && <>{customer.billing_address.street2}<br /></>}
            {(customer?.billing_address?.city || customer?.billing_address?.province || customer?.billing_address?.postal_code) && (
              <>{customer?.billing_address?.city}{customer?.billing_address?.city && customer?.billing_address?.province ? ", " : ""}{customer?.billing_address?.province} {customer?.billing_address?.postal_code}<br /></>
            )}
            {customer?.email}<br />
            {customer?.phone}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span style={{ color: "#666" }}>Invoice Number:</span>
            <span style={{ fontWeight: 600 }}>{invoice.invoice_number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span style={{ color: "#666" }}>Invoice Date:</span>
            <span style={{ fontWeight: 600 }}>{invoice.invoice_date}</span>
          </div>
          {invoice.payment_terms && invoice.payment_terms !== "Custom" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: "#666" }}>Terms:</span>
              <span style={{ fontWeight: 600 }}>{invoice.payment_terms}</span>
            </div>
          )}
          {invoice.due_date && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: "#666" }}>Payment Due:</span>
              <span style={{ fontWeight: 600 }}>{invoice.due_date}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 6px", background: "#f5f5f5", fontWeight: 700, marginTop: 6, borderRadius: 4 }}>
            <span style={{ whiteSpace: "nowrap" }}>Amount Due ({invoice.currency}):</span>
            <span>${(paidTotal > 0 ? amountDue : Number(invoice.total)).toFixed(2)}</span>
          </div>
        </div>
      </div>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#002DF8", color: "white" }}>
            <th style={{ textAlign: "left", padding: 6 }}>Item</th>
            <th style={{ padding: 6 }}>Qty</th>
            <th style={{ padding: 6 }}>Price</th>
            <th style={{ textAlign: "right", padding: 6 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 6 }}>
                {it.item_name}
                {it.description && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{it.description}</div>
                )}
              </td>
              <td style={{ padding: 6, textAlign: "center" }}>{it.quantity}</td>
              <td style={{ padding: 6, textAlign: "center" }}>${Number(it.unit_price).toFixed(2)}</td>
              <td style={{ padding: 6, textAlign: "right" }}>${(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: "right", marginTop: 16, fontSize: 13 }}>
        <p>Subtotal: ${Number(invoice.subtotal).toFixed(2)}</p>
        <p>{taxLabel}: ${Number(invoice.tax_total).toFixed(2)}</p>
        <p style={{ fontWeight: 700, fontSize: 16 }}>Total: ${Number(invoice.total).toFixed(2)} {invoice.currency}</p>
        {paidTotal > 0 && (
          <>
            <p style={{ color: "#4fb33f" }}>Paid: ${paidTotal.toFixed(2)}</p>
            <p style={{ fontWeight: 700, fontSize: 16, color: amountDue > 0 ? "#dc2626" : "#4fb33f" }}>
              Amount Due: ${amountDue.toFixed(2)} {invoice.currency}
            </p>
          </>
        )}
      </div>
      {invoice.notes && (
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #eee" }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>NOTES / TERMS</p>
          <p style={{ fontSize: 13, color: "#333", whiteSpace: "pre-wrap" }}>{invoice.notes}</p>
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 40, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10 }}>
        <span style={{ color: "#111", fontSize: 16, fontWeight: 700 }}>Powered by</span>
        <Wordmark variant="dark" className="h-7!" />
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }} className="no-print">
        <button onClick={() => window.print()} style={{ background: "#002DF8", color: "white", padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 600 }}>
          Print / Save as PDF
        </button>
      </div>
      <style>{`@media print { .no-print { display: none; } html, body { background: #fff !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  )
}

