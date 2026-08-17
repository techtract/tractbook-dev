import { useNavigate } from "react-router-dom"

interface BottomNavProps {
  active: "dashboard" | "sales" | "accounting" | "payments"
}

export default function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate()

  const items = [
    { key: "dashboard", label: "Dashboard", icon: "\u25D4", path: "/dashboard" },
    { key: "sales", label: "Sales", icon: "\uD83C\uDFF7\uFE0F", path: "/estimates" },
    { key: "accounting", label: "Accounting", icon: "\u2696\uFE0F", path: "/coming-soon/accounting" },
    { key: "payments", label: "Payments", icon: "\uD83D\uDCB3", path: "/coming-soon/payments" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-white border-t border-gray-200 flex justify-around py-3">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center gap-1 ${active === item.key ? "text-blue-600" : "text-gray-400"}`}
        >
          <span>{item.icon}</span>
          <span className={`text-xs ${active === item.key ? "font-medium" : ""}`}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

