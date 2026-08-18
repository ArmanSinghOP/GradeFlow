import { Layers } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { StatusBadge } from "../index"
import type { JobStatusResponse } from "../../types"
import { formatRelativeTime } from "../../utils/time"

interface JobsTableProps {
  jobs: JobStatusResponse[]
  isLoading: boolean
}

export function JobsTable({ jobs, isLoading }: JobsTableProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-surface-700 border border-surface-500 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-surface-500">
        <h2 className="text-sm font-medium text-white">Recent Jobs</h2>
        <button onClick={() => navigate("/jobs")} className="text-xs text-brand-400 hover:text-brand-300">View All</button>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-surface-400 border-b border-surface-500">
              <th className="py-3 px-4 font-medium">Job ID</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Submissions</th>
              <th className="py-3 px-4 font-medium">Progress</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Started</th>
              <th className="py-3 px-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-surface-500">
                  <td className="py-3 px-4"><div className="h-4 w-16 bg-surface-600 rounded animate-pulse"></div></td>
                  <td className="py-3 px-4"><div className="h-4 w-16 bg-surface-600 rounded animate-pulse"></div></td>
                  <td className="py-3 px-4"><div className="h-4 w-12 bg-surface-600 rounded animate-pulse"></div></td>
                  <td className="py-3 px-4"><div className="h-2 w-full bg-surface-600 rounded animate-pulse"></div></td>
                  <td className="py-3 px-4"><div className="h-6 w-20 bg-surface-600 rounded-full animate-pulse"></div></td>
                  <td className="py-3 px-4"><div className="h-4 w-16 bg-surface-600 rounded animate-pulse"></div></td>
                  <td className="py-3 px-4"><div className="h-6 w-16 bg-surface-600 rounded animate-pulse"></div></td>
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center p-12 text-surface-400">
                    <Layers size={40} className="opacity-30 mb-4" />
                    <p className="text-white font-medium mb-1">No evaluations yet</p>
                    <p className="text-sm mb-4 text-surface-400">Submit your first batch to get started</p>
                    <button
                      onClick={() => navigate("/submit")}
                      className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Get Started
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.job_id} className="border-b border-surface-500 hover:bg-surface-600 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-surface-200" title={job.job_id}>
                      {job.job_id.substring(0, 8)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {/* Assuming content_type is available on the job, if not we will mock or omit, but let's assume it's omitted or we display a default */}
                    {/* Actually, JobStatusResponse doesn't have content_type. We might just display a generic "Batch" or assume we know it. Let's just create a generic span if not available */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-500 text-surface-100">
                      batch
                    </span>
                  </td>
                  <td className="py-3 px-4 text-surface-200">
                    {job.completed_count} / {job.submission_count}
                  </td>
                  <td className="py-3 px-4 w-32">
                    <div className="w-full bg-surface-500 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress_percent}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={job.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-surface-400 text-xs text-nowrap">
                    {formatRelativeTime(job.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => navigate(`/jobs/${job.job_id}`)}
                      className="text-xs text-brand-400 border border-surface-500 hover:bg-surface-500 rounded px-2 py-1 transition-colors"
                    >
                      Monitor
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
