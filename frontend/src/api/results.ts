import client from "./client"
import type { JobResultsResponse } from "../types"

export const getResults = async (
  jobId: string,
  limit = 100,
  offset = 0
): Promise<JobResultsResponse> => {
  const { data } = await client.get(`/api/v1/results/${jobId}`, {
    params: { limit, offset }
  })
  return data
}

// SSE stream URL — used by useSSE hook directly with EventSource
export const getStreamUrl = (jobId: string): string => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:8000"
  return `${base}/api/v1/results/${jobId}/stream`
}
