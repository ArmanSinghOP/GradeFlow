import client from "./client"
import type {
  AnchorSetSummary,
  AnchorSetCreate,
  CalibrationPreviewResponse,
  ValidationResponse
} from "../types"

export const listAnchors = async (): Promise<{ anchor_sets: AnchorSetSummary[], total: number }> => {
  const { data } = await client.get("/api/v1/anchors")
  return data
}

export const getAnchor = async (id: string): Promise<AnchorSetCreate> => {
  const { data } = await client.get(`/api/v1/anchors/${id}`)
  return data
}

export const createAnchor = async (payload: AnchorSetCreate): Promise<{
  anchor_set_id: string, message: string,
  warnings: string[], anchor_count: number
}> => {
  const { data } = await client.post("/api/v1/anchors", payload)
  return data
}

export const updateAnchor = async (id: string, payload: AnchorSetCreate): Promise<{
  anchor_set_id: string, message: string,
  new_version: number, warnings: string[], anchor_count: number
}> => {
  const { data } = await client.put(`/api/v1/anchors/${id}`, payload)
  return data
}

export const deleteAnchor = async (id: string): Promise<{ message: string, anchor_set_id: string }> => {
  const { data } = await client.delete(`/api/v1/anchors/${id}`)
  return data
}

export const previewCalibration = async (
  id: string, sample_scores: number[]
): Promise<CalibrationPreviewResponse> => {
  const { data } = await client.post(`/api/v1/anchors/${id}/preview`, { sample_scores })
  return data
}

export const validateAnchor = async (id: string): Promise<ValidationResponse> => {
  const { data } = await client.post(`/api/v1/anchors/${id}/validate`)
  return data
}
