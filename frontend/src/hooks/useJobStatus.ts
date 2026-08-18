import { useQuery } from "@tanstack/react-query"
import { getJob } from "../api/jobs"
import type { JobStatusResponse } from "../types"

export const useJobStatus = (jobId: string | null) => {
  const { data: job, isLoading, error, isError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!query.state.data) return 3000
      const terminal = ["completed", "failed"]
      return terminal.includes(query.state.data.status) ? false : 3000
    },
  })

  const isTerminal = job?.status === "completed" || job?.status === "failed"

  return {
    job: job || null,
    isLoading,
    isTerminal,
    error: isError ? (error as Error).message : null,
  }
}

export default useJobStatus
