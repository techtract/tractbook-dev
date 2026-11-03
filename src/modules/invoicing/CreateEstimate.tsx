import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: number;
  description: string;
  qty: number;
  rate: number;
  taxable: boolean;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⊞", path: "/" },
  {
    label: "Sales & Get Paid",
    icon: "💰",
    children: [
      { label: "Estimates", active: true },
      { label: "Invoices" },
    ],
  },
  { label: "Expenses", icon: "💳" },
  { label: "Transactions", icon: "↕" },
  { label: "OCR", icon: "🔍" },
  { label: "Customers", icon: "👥" },
  { label: "Reports", icon: "📊" },
  { label: "Settings", icon: "⚙" },
];

function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-xl font-bold" style={{ color: "#185FA5" }}>
          tractbook
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 font-medium">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <div className="ml-7 space-y-0.5">
                  {item.children.map((child) => (
                    <div
                      key={child.label}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                        child.active
                          ? "font-semibold text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={child.active ? { backgroundColor: "#185FA5" } : {}}
                    >
                      <span>{child.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400">
        v2.4.1 · CA Edition
      </div>
    </aside>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

function TopBar() {
  const [role, setRole] = useState<"SMB" | "Accountant">("SMB");

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 shrink-0">
      {/* Company chip */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-sm font-medium" style={{ color: "#185FA5" }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#185FA5" }}>
          M
        </div>
        Maple Grove Contracting
        <span className="text-blue-300">▾</span>
      </div>

      {/* Status badge */}
      <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
        Draft
      </span>

      {/* Autosave */}
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-success inline-block"></span>
        Autosaved just now
      </span>

      <div className="flex-1" />

      {/* Role toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-sm">
        {(["SMB", "Accountant"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              role === r ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Preview */}
      <button
        className="flex items-center gap-1.5 text-sm font-medium text-white px-3.5 py-1.5 rounded-md transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#185FA5" }}
      >
        <span>👁</span> Preview
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 cursor-pointer">
        KJ
      </div>
    </header>
  );
}

// ─── Klara Banner ────────────────────────────────────────────────────────────

function KlaraBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-3 rounded-lg mx-6 mt-4"
      style={{ backgroundColor: "#EDF7E2", border: "1px solid #C2E09A" }}
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: "#3B6D11" }}
      >
        K
      </div>
      <div className="flex-1 text-sm" style={{ color: "#2A5009" }}>
        <span className="font-semibold">Klara suggests:</span> This client
        typically pays within 15 days — consider setting "Net 15" payment terms
        to improve your cash flow forecast. HST registration detected for this
        customer; tax has been pre-applied.
      </div>
      <button
        onClick={onDismiss}
        className="text-brand-success-dark hover:text-brand-success-dark text-lg leading-none mt-0.5 shrink-0"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Customer Card ────────────────────────────────────────────────────────────

function CustomerCard() {
  const [customer, setCustomer] = useState("Lakeside Builds Inc.");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Bill To
      </h2>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
          LB
        </div>
        <div className="flex-1">
          <input
            className="text-sm font-semibold text-gray-900 w-full bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none pb-0.5"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-0.5">
            123 Lakeview Rd, Toronto ON M4C 1A2 · HST #: 894701234 RT0001
          </p>
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          Change
        </button>
      </div>
    </div>
  );
}

// ─── Estimate Details Card ────────────────────────────────────────────────────

function EstimateDetails() {
  const [details, setDetails] = useState({
    number: "EST-2024-0047",
    date: "2024-05-13",
    validUntil: "2024-06-12",
    paymentTerms: "Net 30",
    po: "PO-89234",
    currency: "CAD",
  });

  const update = (key: string, value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));

  const fields = [
    { key: "number", label: "Estimate #" },
    { key: "date", label: "Date", type: "date" },
    { key: "validUntil", label: "Valid Until", type: "date" },
    { key: "paymentTerms", label: "Payment Terms", type: "select", options: ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt"] },
    { key: "po", label: "PO / Reference" },
    { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD"] },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Estimate Details
      </h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{f.label}</label>
            {f.type === "select" ? (
              <select
                className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
                value={(details as Record<string, string>)[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
              >
                {f.options!.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type ?? "text"}
                className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
                value={(details as Record<string, string>)[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Line Items ───────────────────────────────────────────────────────────────

const HST_RATE = 0.13;

function LineItemsTable({
  discountEnabled,
}: {
  discountEnabled: boolean;
}) {
  const [rows, setRows] = useState<LineItem[]>([
    { id: 1, description: "Foundation Inspection – Phase 1", qty: 1, rate: 2800, taxable: true },
    { id: 2, description: "Framing Labour (80 hrs)", qty: 80, rate: 75, taxable: true },
    { id: 3, description: "Lumber & Materials", qty: 1, rate: 4320.5, taxable: true },
  ]);
  const [discount, setDiscount] = useState(5);
  let nextId = rows.length + 1;

  const addRow = () =>
    setRows((r) => [...r, { id: nextId++, description: "", qty: 1, rate: 0, taxable: true }]);

  const deleteRow = (id: number) =>
    setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: number, key: keyof LineItem, value: string | number | boolean) =>
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );

  const subtotal = rows.reduce((acc, r) => acc + r.qty * r.rate, 0);
  const taxableAmount = rows
    .filter((r) => r.taxable)
    .reduce((acc, r) => acc + r.qty * r.rate, 0);
  const discountAmount = discountEnabled ? subtotal * (discount / 100) : 0;
  const hst = (taxableAmount - (discountEnabled ? taxableAmount * (discount / 100) : 0)) * HST_RATE;
  const total = subtotal - discountAmount + hst;

  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Line Items
        </h2>
        <button
          onClick={addRow}
          className="text-xs px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#185FA5" }}
        >
          + Add Row
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium w-full">Description</th>
            <th className="px-4 py-2.5 text-right font-medium w-20 whitespace-nowrap">Qty</th>
            <th className="px-4 py-2.5 text-right font-medium w-28 whitespace-nowrap">Rate (CAD)</th>
            <th className="px-4 py-2.5 text-right font-medium w-28 whitespace-nowrap">Amount</th>
            <th className="px-4 py-2.5 text-center font-medium w-16">HST</th>
            <th className="px-3 py-2.5 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5">
                <input
                  className="w-full bg-transparent focus:outline-none text-gray-900 placeholder-gray-300"
                  placeholder="Item description…"
                  value={row.description}
                  onChange={(e) => updateRow(row.id, "description", e.target.value)}
                />
              </td>
              <td className="px-4 py-2.5">
                <input
                  type="number"
                  min={0}
                  className="w-16 text-right bg-transparent focus:outline-none text-gray-900"
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, "qty", parseFloat(e.target.value) || 0)}
                />
              </td>
              <td className="px-4 py-2.5">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full text-right bg-transparent focus:outline-none text-gray-900"
                  value={row.rate}
                  onChange={(e) => updateRow(row.id, "rate", parseFloat(e.target.value) || 0)}
                />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-700 font-medium">
                {fmt(row.qty * row.rate)}
              </td>
              <td className="px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={row.taxable}
                  onChange={(e) => updateRow(row.id, "taxable", e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              </td>
              <td className="px-3 py-2.5 text-center">
                <button
                  onClick={() => deleteRow(row.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-100 px-5 py-4 flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>

          {discountEnabled && (
            <div className="flex justify-between items-center text-gray-600">
              <span className="flex items-center gap-1.5">
                Discount
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-blue-400"
                />
                %
              </span>
              <span className="font-medium text-red-500">−{fmt(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>HST (13%)</span>
            <span className="font-medium">{fmt(hst)}</span>
          </div>

          <div
            className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"
            style={{ color: "#185FA5" }}
          >
            <span>Total (CAD)</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Klara Workflows ──────────────────────────────────────────────────────────

interface Workflow {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const INITIAL_WORKFLOWS: Workflow[] = [
  { id: "followup", label: "Auto Follow-Up", description: "Send a reminder 3 days before estimate expires", enabled: true },
  { id: "convert", label: "Smart Convert", description: "Automatically convert to invoice upon client approval", enabled: false },
  { id: "cashflow", label: "Cash Flow Alert", description: "Notify me when this estimate affects 30-day forecast", enabled: true },
  { id: "hst", label: "HST Remittance Tracker", description: "Flag collected HST for next remittance period", enabled: true },
];

function KlaraWorkflows() {
  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);

  const toggle = (id: string) =>
    setWorkflows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: "#534AB7" }}
        >
          K
        </div>
        <h2 className="text-sm font-semibold text-gray-800">Klara Workflows</h2>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium text-white"
          style={{ backgroundColor: "#534AB7" }}
        >
          AI
        </span>
      </div>
      <div className="space-y-3">
        {workflows.map((w) => (
          <div key={w.id} className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{w.label}</p>
              <p className="text-xs text-gray-400">{w.description}</p>
            </div>
            <button
              onClick={() => toggle(w.id)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors mt-0.5 focus:outline-none`}
              style={{ backgroundColor: w.enabled ? "#534AB7" : "#D1D5DB" }}
              role="switch"
              aria-checked={w.enabled}
            >
              <span
                className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                  w.enabled ? "translate-x-4.5" : "translate-x-0.5"
                }`}
                style={{ transform: w.enabled ? "translateX(18px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function ScoreMeter({ score }: { score: number }) {
  const pct = (score / 100) * 251;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path
          d="M10 65 A50 50 0 0 1 110 65"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M10 65 A50 50 0 0 1 110 65"
          fill="none"
          stroke="#3B6D11"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * 0.784} 251`}
        />
        <text x="60" y="62" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#185FA5">
          {score}
        </text>
      </svg>
      <p className="text-xs text-gray-500">Conversion Score</p>
    </div>
  );
}

function RightPanel({ discountEnabled, setDiscountEnabled }: {
  discountEnabled: boolean;
  setDiscountEnabled: (v: boolean) => void;
}) {
  const [reminder, setReminder] = useState("3 days before expiry");

  const designOptions = [
    { label: "Template", value: "Professional Blue" },
    { label: "Logo", value: "Maple Grove Logo.png" },
    { label: "Accent", value: "#185FA5" },
    { label: "Font", value: "Inter / System UI" },
  ];

  return (
    <div className="w-72 shrink-0 space-y-4">
      {/* Conversion Score */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <ScoreMeter score={82} />
        <div className="mt-3 space-y-1.5 text-xs text-gray-600">
          <div className="flex items-start gap-1.5">
            <span style={{ color: "#3B6D11" }}>✓</span>
            <span>Competitive rate for Toronto market</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span style={{ color: "#3B6D11" }}>✓</span>
            <span>HST properly applied</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-amber-500">⚠</span>
            <span>No deposit clause — consider adding</span>
          </div>
        </div>
      </div>

      {/* Design Options */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Design Options
        </h3>
        <div className="space-y-2">
          {designOptions.map((o) => (
            <div key={o.label} className="flex justify-between items-center text-xs">
              <span className="text-gray-500">{o.label}</span>
              <span className="text-gray-800 font-medium truncate max-w-[130px]">{o.value}</span>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full text-xs border border-gray-200 rounded-md py-1.5 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
          Customize Template
        </button>
      </div>

      {/* Discount toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Discount</p>
            <p className="text-xs text-gray-400">Apply a % discount to subtotal</p>
          </div>
          <button
            onClick={() => setDiscountEnabled(!discountEnabled)}
            className="relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none"
            style={{ backgroundColor: discountEnabled ? "#185FA5" : "#D1D5DB" }}
            role="switch"
            aria-checked={discountEnabled}
          >
            <span
              className="inline-block w-3.5 h-3.5 rounded-full bg-white shadow mt-0.5 transition-transform"
              style={{ transform: discountEnabled ? "translateX(18px)" : "translateX(2px)" }}
            />
          </button>
        </div>
      </div>

      {/* Reminders */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Reminder Schedule
        </h3>
        <select
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
          className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
        >
          {["1 day before expiry", "3 days before expiry", "7 days before expiry", "No reminder"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          Klara will send the reminder automatically via email.
        </p>
      </div>
    </div>
  );
}

// ─── Notes & Attachments ──────────────────────────────────────────────────────

function NotesAttachments() {
  const [notes, setNotes] = useState(
    "All work performed per Ontario Building Code 2012. Price valid for 30 days. A 25% deposit is required upon acceptance. HST registration number will appear on final invoice."
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Notes & Attachments
      </h2>
      <textarea
        className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-400 resize-none"
        rows={4}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes visible to your client…"
      />
      <div className="mt-3 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-colors">
        <span className="block text-2xl mb-1">📎</span>
        Drop files here or <span className="underline">browse</span>
        <p className="text-xs mt-0.5">PDF, PNG, XLSX · max 10 MB</p>
      </div>
    </div>
  );
}

// ─── Bottom Bar ───────────────────────────────────────────────────────────────

function BottomBar() {
  return (
    <div className="fixed bottom-0 left-56 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-3 z-10">
      <button className="text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
        Save Draft
      </button>
      <div className="flex-1" />
      <button
        className="text-sm px-4 py-2 rounded-md border font-medium transition-colors hover:opacity-90"
        style={{ borderColor: "#185FA5", color: "#185FA5" }}
      >
        Convert to Invoice
      </button>
      <button
        className="text-sm px-5 py-2 rounded-md text-white font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#185FA5" }}
      >
        Review & Send →
      </button>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function CreateEstimate() {
  const [showBanner, setShowBanner] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Page header */}
        <div className="px-6 pt-5 pb-2 flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-gray-900">Create Estimate</h1>
          <span className="text-sm text-gray-400">EST-2024-0047</span>
        </div>

        {showBanner && <KlaraBanner onDismiss={() => setShowBanner(false)} />}

        {/* Main content */}
        <div className="flex gap-5 px-6 pb-24 pt-4 min-w-0">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-5">
            <CustomerCard />
            <EstimateDetails />
            <LineItemsTable discountEnabled={discountEnabled} />
            <KlaraWorkflows />
            <NotesAttachments />
          </div>

          {/* Right panel */}
          <RightPanel
            discountEnabled={discountEnabled}
            setDiscountEnabled={setDiscountEnabled}
          />
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
