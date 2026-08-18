import type { JobStatusResponse, JobStatus } from "../../types"
import { formatRelativeTime } from "../../utils/time"

interface ActivityFeedProps {
  jobs: JobStatusResponse[]
}

interface ActivityEvent {
  id: string
  job_id: string
  status: JobStatus
  text: string
  timestamp: string
}

function generateEventsForJob(job: JobStatusResponse): ActivityEvent[] {
  const events: ActivityEvent[] = []
  
  // Always an event for the current status (using updated_at as proxy for when it changed)
  events.push({
    id: `${job.job_id}-${job.status}`,
    job_id: job.job_id,
    status: job.status,
    text: getEventText(job.status, job.submission_count),
    timestamp: job.updated_at
  })
  
  // If it's completed or failed, we also know when it queued (created_at)
  if (job.status === "completed" || job.status === "failed") {
    // Only add if it's different enough or just always string it
    events.push({
      id: `${job.job_id}-queued`,
      job_id: job.job_id,
      status: "queued",
      text: getEventText("queued", job.submission_count),
      timestamp: job.created_at
    })
  }

  return events
}

function getEventText(status: JobStatus, count: number): string {
  switch (status) {
    case "queued": return `Batch queued — ${count} submissions`
    case "embedding": return "Generating embeddings..."
    case "clustering": return `Clustering ${count} submissions`
    case "evaluating": return "LLM evaluation in progress"
    case "normalising": return "Normalising scores"
    case "generating_feedback": return "Writing feedback"
    case "completed": return `Evaluation complete — ${count} results ready`
    case "failed": return "Evaluation failed"
    default: return "Processing..."
  }
}

function getStatusColor(status: JobStatus): string {
  switch (status) {
    case "queued": return "bg-surface-400"
    case "embedding": return "bg-blue-400"
    case "clustering": return "bg-indigo-400"
    case "evaluating": return "bg-brand-400"
    case "normalising": return "bg-purple-400"
    case "generating_feedback": return "bg-teal-400"
    case "completed": return "bg-green-400"
    case "failed": return "bg-red-400"
    default: return "bg-surface-400"
  }
}

export function ActivityFeed({ jobs }: ActivityFeedProps) {
  const activeJobsCount = jobs.filter(j => !["completed", "failed"].includes(j.status)).length

  // Flatten, sort by timestamp (newest first), take 10
  const allEvents = jobs
    .flatMap(generateEventsForJob)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  return (
    <div className="bg-surface-700 border border-surface-500 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-surface-500">
        <h2 className="text-sm font-medium text-white flex items-center gap-2">
          Live Activity
          {activeJobsCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </h2>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        {allEvents.length === 0 ? (
          <div className="flex justify-center items-center h-full text-sm text-surface-400">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {allEvents.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5 h-full">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(event.status)}`}></div>
                  {/* connecting line could go here if wanted */}
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-white">{event.text}</p>
                  <p className="text-xs text-surface-400 gap-1 flex items-center">
                    <span className="font-mono">{event.job_id.substring(0, 8)}</span>
                    <span>&bull;</span>
                    {formatRelativeTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
