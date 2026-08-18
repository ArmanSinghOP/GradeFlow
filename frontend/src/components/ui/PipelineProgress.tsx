import { Check, X } from "lucide-react"
import { cn } from "../../utils/cn"
import type { JobStatus } from "../../types"

export interface PipelineProgressProps {
  status: JobStatus
}

const STAGES = [
  { id: "queued", label: "Queued" },
  { id: "embedding", label: "Embedding" },
  { id: "clustering", label: "Clustering" },
  { id: "evaluating", label: "Evaluating" },
  { id: "normalising", label: "Normalising" },
  { id: "generating_feedback", label: "Feedback" },
  { id: "completed", label: "Completed" },
]

export const PipelineProgress = ({ status }: PipelineProgressProps) => {
  const isFailed = status === "failed"
  const activeStage = isFailed ? "completed" : status
  
  const currentIndex = STAGES.findIndex((s) => s.id === activeStage)
  
  return (
    <div className="flex w-full items-center justify-between relative">
      <div className="absolute left-0 top-3 -z-10 h-0.5 w-full bg-surface-500">
        <div 
          className="h-full bg-brand-400 transition-all duration-500"
          style={{ width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 100}%` }}
        />
      </div>
      
      {STAGES.map((stage, i) => {
        const isPast = i < currentIndex
        const isCurrent = i === currentIndex
        const isFuture = i > currentIndex

        return (
          <div key={stage.id} className="flex flex-col items-center gap-2 relative z-10 px-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-white bg-surface-900 ring-4 ring-surface-900",
                isPast && !isFailed ? "bg-brand-400" : "",
                isCurrent && !isFailed && stage.id !== "completed" ? "bg-brand-400 animate-pulse-slow ring-4 ring-brand-400/20" : "",
                isCurrent && isFailed ? "bg-red-500" : "",
                isCurrent && !isFailed && stage.id === "completed" ? "bg-brand-400" : "",
                isFuture ? "bg-surface-500" : ""
              )}
            >
              {isPast && !isFailed && <Check size={14} strokeWidth={3} />}
              {isCurrent && isFailed && <X size={14} strokeWidth={3} />}
              {isCurrent && !isFailed && stage.id === "completed" && <Check size={14} strokeWidth={3} />}
              {/* Future is empty circle inherently by having bg-surface-500 */}
            </div>
            <span className={cn(
              "text-[10px] font-medium tracking-wide uppercase text-center",
              isCurrent || (isPast && !isFailed) ? "text-white" : "text-surface-400"
            )}>
              {stage.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
