export interface ChipOption {
  value: string
  label: string
}

interface Props {
  options: (string | ChipOption)[]
  value: string
  onChange: (value: string) => void
  label: string
}

// One-of-many choice shown as pills. Used wherever setup asks a short question,
// so every screen picks answers the same way.
export default function OptionChips({ options, value, onChange, label }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`text-sm rounded-full px-4 py-2 border transition-colors ${
              selected
                ? "bg-blue-700 text-white border-blue-700 font-medium"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
