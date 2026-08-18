import { useState, useMemo, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Loader2, AlertCircle, CheckCircle, BarChart3 } from "lucide-react"

import { useJobStatus } from "../hooks/useJobStatus"
import { useSSE } from "../hooks/useSSE"
import { useAppStore } from "../store/useAppStore"
import { JobSummaryBar } from "../components/monitor/JobSummaryBar"
import { PipelineStageTracker } from "../components/monitor/PipelineStageTracker"
import { StreamEventLog } from "../components/monitor/StreamEventLog"
import { LiveResultCard } from "../components/monitor/LiveResultCard"
import { FeedbackDrawer } from "../components"

import type { SubmissionResult } from "../types"
import { formatDuration } from "../utils/time"

const JobMonitor = () => {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { job, isLoading, error: statusError } = useJobStatus(jobId ?? null)
  const { events, isConnected, isDone, error: sseError } = useSSE(jobId ?? null)
  const removeActiveJob = useAppStore((state) => state.removeActiveJob)

  const [selectedResult, setSelectedResult] = useState<SubmissionResult | null>(null)

  const streamedResults = useMemo(() => {
    return events
      .filter((e) => e.event === "result" && e.result)
      .map((e) => e.result!)
      .reverse() // newest first
  }, [events])

  const latestProgress = useMemo(() => {
    const progressEvents = events.filter((e) => e.event === "progress")
    return progressEvents[progressEvents.length - 1] ?? null
  }, [events])

  const connectionStatus = useMemo(() => {
    if (sseError) return "error"
    if (isDone) return "done"
    if (isConnected) return "connected"
    return "connecting"
  }, [isConnected, isDone, sseError])

  const progressPercent = latestProgress?.progress_percent ?? job?.progress_percent ?? 0

  useEffect(() => {
    if (jobId && (job?.status === "completed" || isDone)) {
      removeActiveJob(jobId)
    }
  }, [jobId, job?.status, isDone, removeActiveJob])

  if (!jobId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Job not found</h2>
        <p className="text-surface-400 mb-6">The job ID could not be identified from the URL.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-surface-700 hover:bg-surface-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (isLoading && !job) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-surface-400">
        <Loader2 size={40} className="animate-spin text-brand-400" />
        <p className="font-medium">Connecting to job monitor...</p>
      </div>
    )
  }

  const isCompleted = job?.status === "completed" || isDone
  const isFailed = job?.status === "failed"

  return (
    <div className="flex flex-col bg-surface-900">
      <JobSummaryBar job={job} connectionStatus={connectionStatus} />
      
      <div className="p-6 flex flex-col gap-6 flex-1">
        {job && <PipelineStageTracker status={job.status} progressPercent={progressPercent} />}
        
        {isCompleted && (
          <div className="bg-brand-400/10 border border-brand-400 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-brand-400/20 p-2 rounded-full text-brand-400">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Evaluation Complete</h3>
                <p className="text-brand-400/80">
                  {job?.completed_count || 0} submissions evaluated in {job ? formatDuration(Math.round((new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()) / 60000)) : "unknown time"}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/results/${jobId}`)}
              className="bg-brand-400 hover:bg-brand-500 text-black px-6 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-brand-400/20"
            >
              View Full Results
            </button>
          </div>
        )}

        {isFailed && (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-red-500/20 p-2 rounded-full text-red-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Evaluation Failed</h3>
                <p className="text-red-400">
                  {job?.error_message || "An unexpected error occurred during evaluation."}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/submit")}
              className="bg-surface-700 hover:bg-surface-600 text-white px-6 py-2.5 rounded-lg font-bold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="flex-1 min-h-[500px] grid grid-cols-12 gap-6">
          {/* Left Column - Live Results (60%) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col h-full bg-surface-900 overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">Live Results</h2>
              <span className="bg-brand-400 text-black text-xs font-bold px-2.5 py-1 rounded-full">
                {streamedResults.length} received
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-4 flex flex-col gap-4">
              {streamedResults.length === 0 ? (
                <div className="flex-col w-full h-full flex items-center justify-center pt-10">
                  <BarChart3 size={40} className="text-brand-400 opacity-20 mb-3 animate-pulse" />
                  <p className="text-surface-400 font-medium">Waiting for results...</p>
                  <p className="text-surface-500 text-sm mt-1">Results will appear here as they are evaluated</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {streamedResults.map((result) => (
                    <LiveResultCard
                      key={result.submission_id}
                      result={result}
                      onClick={() => setSelectedResult(result)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stream Event Log (40%) */}
          <div className="col-span-12 lg:col-span-5 h-full overflow-hidden">
            <StreamEventLog events={events} />
          </div>
        </div>
      </div>

      {/* Feedback Drawer */}
      <FeedbackDrawer
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  )
}

export default JobMonitor
