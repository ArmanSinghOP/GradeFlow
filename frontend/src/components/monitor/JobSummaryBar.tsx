import { formatRelativeTime } from "../../utils/time"
import { StatusBadge } from "../ui/StatusBadge"
import type { JobStatusResponse, JobStatus } from "../../types"

export interface JobSummaryBarProps {
  job: JobStatusResponse | null
  connectionStatus: "connecting" | "connected" | "done" | "error"
}

export const JobSummaryBar = ({ job, connectionStatus }: JobSummaryBarProps) => {
  return (
    <div className="w-full bg-surface-700 border-b border-surface-500 px-6 py-3 flex items-center justify-between">
      <div className="flex flex-row items-center gap-6 text-sm text-surface-200">
        {job ? (
          <>
            <div className="flex items-center gap-2" title={job.job_id}>
              <span className="font-semibold text-white">Job ID</span>
              <span className="font-mono text-xs bg-surface-800 px-2 py-1 rounded">
                {job.job_id.slice(0, 16)}...
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="bg-surface-800 text-surface-300 px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold">
                content
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Submissions:</span>
              <span className="text-white font-semibold">
                {job.completed_count} / {job.submission_count}
              </span>
            </div>

            {job.cluster_count !== null && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-surface-400">
                  {job.cluster_count} clusters
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-medium">Started:</span>
              <span>{formatRelativeTime(job.created_at)}</span>
            </div>
          </>
        ) : (
          <div className="animate-pulse bg-surface-600 h-5 w-64 rounded"></div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          {connectionStatus === "connecting" && (
            <>
              <div className="w-2 h-2 rounded-full bg-surface-400 animate-pulse" />
              <span className="text-surface-400">Connecting...</span>
            </>
          )}
          {connectionStatus === "connected" && (
            <>
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-brand-400 font-medium">Live</span>
            </>
          )}
          {connectionStatus === "done" && (
            <>
              <div className="w-2 h-2 rounded-full bg-surface-400" />
              <span className="text-surface-400">Stream closed</span>
            </>
          )}
          {connectionStatus === "error" && (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-500">Connection error</span>
            </>
          )}
        </div>
        
        {job && <StatusBadge status={job.status} />}
      </div>
    </div>
  )
}

export default JobSummaryBar
