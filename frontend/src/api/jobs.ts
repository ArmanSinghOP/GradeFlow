import client from "./client"
import type { JobStatusResponse, SubmissionContentResponse } from "../types"

export const getJob = async (jobId: string): Promise<JobStatusResponse> => {
  const { data } = await client.get(`/api/v1/jobs/${jobId}`)
  return data
}

export const listJobs = async (
  limit = 20,
  offset = 0
): Promise<JobStatusResponse[]> => {
  const { data } = await client.get("/api/v1/jobs", {
    params: { limit, offset }
  })
  return data
}

export const getSubmissionContent = async (
  jobId: string,
  submissionId: string
): Promise<SubmissionContentResponse> => {
  const { data } = await client.get(`/api/v1/jobs/${jobId}/submissions/${submissionId}`)
  return data
}
