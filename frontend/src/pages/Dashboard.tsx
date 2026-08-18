import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listJobs } from "../api/jobs"
import { StatsRow } from "../components/dashboard/StatsRow"
import { JobsTable } from "../components/dashboard/JobsTable"
import { ActivityFeed } from "../components/dashboard/ActivityFeed"
import { ErrorState } from "../components"

export default function Dashboard() {
  const navigate = useNavigate()
  
  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listJobs(20, 0),
    refetchInterval: 5000,
    select: (data) => [...data].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  })

  if (error) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center">
        <ErrorState 
          title="Failed to load dashboard"
          message="Could not fetch the latest evaluation jobs."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Real-time evaluation pipeline monitor</p>
        </div>
        <button
          onClick={() => navigate("/submit")}
          className="flex items-center gap-2 bg-brand-400 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span>New Evaluation</span>
        </button>
      </div>

      <div className="shrink-0">
        <StatsRow jobs={jobs} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 overflow-hidden h-full">
          <JobsTable jobs={jobs} isLoading={isLoading} />
        </div>
        <div className="overflow-hidden h-full">
          <ActivityFeed jobs={jobs} />
        </div>
      </div>
    </div>
  )
}
