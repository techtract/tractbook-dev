interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  options: (string | { value: string; label: string })[]
  className?: string
  label?: string
}

// A plain list picker (best on phones) with a clean look instead of the browser's default arrows.
export default function SelectField({ id, value, onChange, placeholder, options, className = "", label }: Props) {
  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none border border-gray-300 rounded-lg pl-4 pr-10 py-3 outline-none focus:border-blue-600 bg-white ${
          value ? "text-gray-900" : "text-gray-400"
        }`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        })}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}
