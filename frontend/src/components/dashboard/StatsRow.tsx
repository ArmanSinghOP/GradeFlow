import { Layers, Activity, CheckCircle, FileText } from "lucide-react"
import { StatCard, SkeletonCard } from "../index"
import type { JobStatusResponse } from "../../types"

interface StatsRowProps {
  jobs: JobStatusResponse[]
  isLoading?: boolean
}

export function StatsRow({ jobs, isLoading }: StatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} lines={2} showHeader={false} className="p-6 h-28" />
        ))}
      </div>
    )
  }

  const totalJobs = jobs.length
  const activeJobs = jobs.filter((j) => !["completed", "failed"].includes(j.status)).length
  const completedJobs = jobs.filter((j) => j.status === "completed").length
  const totalSubmissions = jobs.reduce((sum, j) => sum + j.submission_count, 0)

  return (
    <div className="grid grid-cols-4 gap-6">
      <StatCard
        label="Total Jobs"
        value={totalJobs.toString()}
        icon={Layers}
        color="brand"
      />
      <StatCard
        label="Active Jobs"
        value={activeJobs.toString()}
        icon={Activity}
        color="amber"
      />
      <StatCard
        label="Completed"
        value={completedJobs.toString()}
        icon={CheckCircle}
        color="brand"
      />
      <StatCard
        label="Total Submissions"
        value={totalSubmissions.toLocaleString()}
        icon={FileText}
        color="blue"
      />
    </div>
  )
}
