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

export default function PrintEstimate() {
  const { id } = useParams<{ id: string }>()
  const [estimate, setEstimate] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [business, setBusiness] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    if (!id) return
    const { data: est } = await supabase.from("estimates").select("*, customers(*)").eq("id", id).maybeSingle()
    if (!est) return
    setEstimate(est)
    setCustomer(est.customers)

    const { data: biz } = await supabase.from("businesses").select("*").eq("id", est.business_id).maybeSingle()
    setBusiness(biz)

    const { data: lineItems } = await supabase.from("estimate_line_items").select("*").eq("estimate_id", id).order("sort_order")
    setItems(lineItems || [])
  }

  if (!estimate) return <p style={{ padding: 40 }}>Loading...</p>

  const isDraft = !estimate.sent_at && estimate.status !== "sent"

  const provincePreset = business?.country === "CA" && business?.region ? CANADA_TAX_RATES[business.region] : null
  const taxLabel =
    Number(estimate.tax_total) > 0 && provincePreset && Math.abs(provincePreset.rate - (Number(estimate.subtotal) > 0 ? (Number(estimate.tax_total) / Number(estimate.subtotal)) * 100 : 0)) < 0.5
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
      <div style={{ textAlign: "right", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>ESTIMATE</h1>
        <p style={{ fontSize: 13, color: "#555" }}>
          <b>{business?.name}</b><br />
          {business?.street1}<br />
          {business?.city}, {business?.region}<br />
          {business?.country === "CA" ? "Canada" : "United States"}
          {business?.phone && <><br />Phone: {business.phone}</>}
          {business?.tax_registration_number && <><br />GST/HST No. {formatGstHst(business.tax_registration_number)}</>}
        </p>
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
            <span style={{ color: "#666" }}>Estimate Number:</span>
            <span style={{ fontWeight: 600 }}>{estimate.estimate_number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span style={{ color: "#666" }}>Estimate Date:</span>
            <span style={{ fontWeight: 600 }}>{estimate.estimate_date}</span>
          </div>
          {estimate.due_date && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: "#666" }}>Valid Until:</span>
              <span style={{ fontWeight: 600 }}>{estimate.due_date}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 6px", background: "#f5f5f5", fontWeight: 700, marginTop: 6, borderRadius: 4 }}>
            <span style={{ whiteSpace: "nowrap" }}>Total ({estimate.currency}):</span>
            <span>${Number(estimate.total).toFixed(2)}</span>
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
        <p>Subtotal: ${Number(estimate.subtotal).toFixed(2)}</p>
        <p>{taxLabel}: ${Number(estimate.tax_total).toFixed(2)}</p>
        <p style={{ fontWeight: 700, fontSize: 16 }}>Total: ${Number(estimate.total).toFixed(2)} {estimate.currency}</p>
      </div>

      {estimate.notes && (
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #eee" }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>NOTES / TERMS</p>
          <p style={{ fontSize: 13, color: "#333", whiteSpace: "pre-wrap" }}>{estimate.notes}</p>
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
