import client from "./client"
import type { BatchSubmitRequest, BatchSubmitResponse } from "../types"

export const submitBatch = async (
  payload: BatchSubmitRequest
): Promise<BatchSubmitResponse> => {
  const { data } = await client.post("/api/v1/evaluate", payload)
  return data
}
