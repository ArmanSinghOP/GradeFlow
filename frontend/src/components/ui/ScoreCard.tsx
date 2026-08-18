import { AlertTriangle } from "lucide-react"
import { cn } from "../../utils/cn"
import type { SubmissionResult } from "../../types"

export interface ScoreCardProps {
  result: SubmissionResult
  onClick?: () => void
}

export const ScoreCard = ({ result, onClick }: ScoreCardProps) => {
  const scoreBase = result.final_score
  let tierColor = "bg-red-500"
  if (scoreBase >= 80) tierColor = "bg-brand-400"
  else if (scoreBase >= 60) tierColor = "bg-amber-400"
  else if (scoreBase >= 40) tierColor = "bg-orange-500"

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-lg border border-surface-500 bg-surface-700 p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-surface-600"
      )}
    >
      <div className={cn("absolute bottom-0 left-0 top-0 w-1", tierColor)} />
      
      <div className="flex items-center justify-between ml-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-surface-400">
            {result.submission_id.slice(0, 20)}
          </span>
          {result.flagged_for_review && (
            <AlertTriangle size={16} className="text-amber-500" />
          )}
        </div>
        <div className="rounded bg-surface-800 px-2 py-0.5 text-xs font-semibold text-surface-400 tracking-wide uppercase">
          Top {Math.round(100 - result.percentile)}%
        </div>
      </div>
      
      <div className="flex items-end justify-between ml-2">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold text-white">
            {result.final_score.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-surface-400">
            / {result.max_possible_score}
          </span>
        </div>
        <span className="text-sm text-surface-400">
          #{result.rank} of {result.total_in_cohort}
        </span>
      </div>
      
      <div className="absolute bottom-0 left-1 right-0 h-0.5 bg-surface-800">
        <div 
          className="h-full bg-white/20" 
          style={{ width: `${result.confidence * 100}%` }} 
        />
      </div>
    </div>
  )
}
