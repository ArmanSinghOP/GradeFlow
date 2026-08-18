import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { listJobs } from "../api/jobs"
import { SkeletonCard, ErrorState, StatusBadge, PipelineProgress } from "../components"
import { formatRelativeTime } from "../utils/time"

export default function Jobs() {
  const navigate = useNavigate()
  
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Completed" | "Failed">("All")

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["jobs", 0], // Assuming just first 50
    queryFn: () => listJobs(50, 0),
    refetchInterval: 10_000,
    select: (data) => [...data].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  })

  const filteredJobs = jobs.filter(job => {
    if (activeFilter === "All") return true
    if (activeFilter === "Active") return ["pending", "processing"].includes(job.status)
    if (activeFilter === "Completed") return job.status === "completed"
    if (activeFilter === "Failed") return job.status === "failed"
    return true
  })

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} lines={2} showHeader={false} className="p-4" />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <ErrorState 
          title="Failed to load jobs"
          message="There was an error communicating with the server."
        />
      )
    }

    if (jobs.length === 0) {
      return (
        <ErrorState 
          title="No jobs yet"
          message="You haven't run any evaluations yet."
          actionLabel="Submit Batch"
          onAction={() => navigate("/submit")}
        />
      )
    }

    if (filteredJobs.length === 0) {
      return (
        <div className="text-center py-12 text-surface-400">
          No jobs match the selected filter.
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {filteredJobs.map((job) => {
          const isActive = ["pending", "processing"].includes(job.status)
          const isCompleted = job.status === "completed"
          const isFailed = job.status === "failed"

          return (
            <div 
              key={job.job_id}
              className="bg-surface-700 rounded-xl border border-surface-500 p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-white">
                    {job.job_id.substring(0, 16)}...
                  </span>
                  {job.content_type && (
                    <span className="bg-surface-600 text-surface-200 text-xs px-2 py-0.5 rounded uppercase tracking-wider font-medium">
                      {job.content_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-surface-400">
                    {formatRelativeTime(job.created_at)}
                  </span>
                  <StatusBadge status={job.status} />
                </div>
              </div>

              <div className="mt-3">
                <PipelineProgress status={job.status} progressPercent={job.progress_percent} />
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="flex-1 max-w-sm">
                  <div className="flex justify-between text-xs text-surface-300 mb-1">
                    <span>
                      {job.completed_count} / {job.submission_count} submissions
                    </span>
                    <span>{job.progress_percent}%</span>
                  </div>
                  <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-400 transition-all duration-500"
                      style={{ width: `${job.progress_percent}%` }}
                    />
                  </div>
                </div>

                <div>
                  {isCompleted && (
                    <button
                      onClick={() => navigate(`/results/${job.job_id}`)}
                      className="bg-surface-600 hover:bg-surface-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Results
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => navigate(`/jobs/${job.job_id}`)}
                      className="bg-brand-400/10 hover:bg-brand-400/20 text-brand-400 border border-brand-400/20 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Monitor
                    </button>
                  )}
                  {isFailed && (
                    <span className="text-red-400 text-sm font-medium px-4 py-1.5">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">All Jobs</h1>
            <span className="bg-surface-700 text-surface-300 text-xs font-bold px-2.5 py-1 rounded-full">
              {jobs.length}
            </span>
          </div>
          <p className="text-sm text-surface-400 mt-1">View and monitor all your evaluation jobs</p>
        </div>
        <button 
          onClick={() => navigate("/submit")}
          className="flex items-center gap-2 bg-brand-400 hover:bg-brand-600 text-surface-900 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          New Evaluation
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        {["All", "Active", "Completed", "Failed"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter
                ? "bg-brand-400 text-surface-900"
                : "bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-white"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  )
}
