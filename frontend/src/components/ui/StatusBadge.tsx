import { cn } from "../../utils/cn"
import type { JobStatus } from "../../types"

export interface StatusBadgeProps {
  status: JobStatus
  size?: "sm" | "md"
}

const STATUS_COLORS: Record<JobStatus, string> = {
  queued: "#888780",
  embedding: "#378ADD",
  clustering: "#7F77DD",
  evaluating: "#EF9F27",
  normalising: "#D85A30",
  generating_feedback: "#D4537E",
  completed: "#1D9E75",
  failed: "#E24B4A",
}

const ACTIVE_STATUSES: JobStatus[] = [
  "embedding",
  "clustering",
  "evaluating",
  "normalising",
  "generating_feedback",
]

export const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  const hexColor = STATUS_COLORS[status] || STATUS_COLORS.queued
  const isActive = ACTIVE_STATUSES.includes(status)
  
  const label = status === "generating_feedback" 
    ? "Generating Feedback"
    : status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium tracking-wide",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
      style={{
        backgroundColor: `${hexColor}26`,
        color: hexColor,
      }}
    >
      <span className="relative flex h-2 w-2">
        {isActive && (
          <span
            className="absolute inline-flex h-full w-full animate-pulse-slow rounded-full opacity-75"
            style={{ backgroundColor: hexColor }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: hexColor }}
        />
      </span>
      {label}
    </div>
  )
}
