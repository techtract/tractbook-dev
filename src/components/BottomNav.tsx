import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"

interface BottomNavProps {
  active: "dashboard" | "sales" | "ocr" | "accounting" | "payments"
}

// One consistent set of line icons (24px grid, rounded ends) so the bar matches the rest of the app
// and looks the same on every phone, unlike emoji which come from each device's own font.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const ICONS: Record<BottomNavProps["active"], ReactNode> = {
  dashboard: (
    <Icon>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </Icon>
  ),
  sales: (
    <Icon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  ),
  ocr: (
    <Icon>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" />
    </Icon>
  ),
  accounting: (
    <Icon>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
    </Icon>
  ),
  payments: (
    <Icon>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </Icon>
  ),
}

export default function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate()

  const items = [
    { key: "dashboard", label: "Dashboard", path: "/dashboard" },
    { key: "sales", label: "Sales", path: "/estimates" },
    { key: "ocr", label: "OCR", path: "/ocr" },
    { key: "accounting", label: "Accounting", path: "/coming-soon/accounting" },
    { key: "payments", label: "Payments", path: "/coming-soon/payments" },
  ] as const

  // Floats over the bottom of the scrolling page: 68px tall + 12px margin, pulled up by 80px so it takes no layout space.
  return (
    <nav aria-label="Main" className="glass-bar relative z-30 shrink-0 mx-3 mb-3 -mt-[80px] h-[68px] rounded-[28px] flex justify-around items-center px-1">
      {items.map((item) => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 h-14 mx-0.5 rounded-[20px] flex flex-col items-center justify-center gap-1 ${
              isActive ? "text-brand-blue bg-brand-blue/10" : "text-[#5b6472] active:bg-brand-blue/10"
            }`}
          >
            {ICONS[item.key]}
            <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
