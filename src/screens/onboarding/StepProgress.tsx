import { Wordmark } from "../../components/ui/Wordmark"

interface StepProgressProps {
  current: number
  total: number
}

export default function StepProgress({ current, total }: StepProgressProps) {
  return (
    <div className="mb-6">
      <Wordmark variant="dark" className="mb-6" />
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: total }).map((_, i) => {
          const stepNumber = i + 1
          let colorClass = "bg-gray-200"
          if (stepNumber < current) {
            colorClass = "bg-blue-700"
          } else if (stepNumber === current) {
            colorClass = "bg-blue-300"
          }
          return <div key={i} className={`h-1.5 flex-1 rounded-full ${colorClass}`} />
        })}
      </div>
      <p className="text-xs text-gray-500">Step {current} of {total}</p>
    </div>
  )
}
