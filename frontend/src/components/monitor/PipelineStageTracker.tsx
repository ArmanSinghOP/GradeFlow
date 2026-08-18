import { PipelineProgress } from "../ui/PipelineProgress"
import type { JobStatus } from "../../types"

export interface PipelineStageTrackerProps {
  status: JobStatus
  progressPercent: number
}

const STAGE_LABELS: Record<JobStatus, string> = {
  queued: "Waiting to start...",
  embedding: "Generating embeddings...",
  clustering: "Clustering submissions...",
  evaluating: "Running LLM evaluation",
  normalising: "Normalising scores...",
  generating_feedback: "Writing personalised feedback",
  completed: "Evaluation complete",
  failed: "Evaluation failed",
}

export const PipelineStageTracker = ({ status, progressPercent }: PipelineStageTrackerProps) => {
  const percent = Math.min(100, Math.max(0, Math.round(progressPercent)))
  const isFailed = status === "failed"

  return (
    <div className="w-full bg-surface-700 rounded-xl border border-surface-500 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-white">Pipeline Progress</span>
        <span className="text-sm text-brand-400">{percent}% complete</span>
      </div>

      <PipelineProgress status={status} />

      <div className="mt-8 relative w-full h-1 bg-surface-500 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-brand-400 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-center">
        <span className={`text-sm tracking-wide ${isFailed ? "text-red-400 font-semibold" : "text-surface-300"}`}>
          Currently: {STAGE_LABELS[status] || "Unknown stage"}
        </span>
      </div>
    </div>
  )
}

export default PipelineStageTracker
