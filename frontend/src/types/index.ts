export type ContentType = "essay" | "code" | "report" | "interview"

export type JobStatus =
  | "queued" | "embedding" | "clustering" | "evaluating"
  | "normalising" | "generating_feedback" | "completed" | "failed"

export interface RubricCriterion {
  name: string
  description: string
  weight: number       // 0-1, all criteria must sum to 1.0
  max_score: number    // default 10.0
}

export interface RubricDefinition {
  name: string
  description: string
  criteria: RubricCriterion[]
}

export interface SubmissionItem {
  id: string
  content: string
  content_type: ContentType
  metadata?: Record<string, unknown>
}

export interface BatchSubmitRequest {
  submissions: SubmissionItem[]
  rubric: RubricDefinition
  anchor_set_id?: string
  content_type: ContentType
}

export interface BatchSubmitResponse {
  job_id: string
  status: string
  submission_count: number
  estimated_minutes: number
  created_at: string
}

export interface JobStatusResponse {
  job_id: string
  status: JobStatus
  submission_count: number
  completed_count: number
  cluster_count: number | null
  progress_percent: number
  created_at: string
  updated_at: string
  error_message: string | null
}

export interface CriterionScore {
  criterion_name: string
  score: number
  max_score: number
  reasoning: string
}

export interface SubmissionResult {
  submission_id: string
  job_id: string
  final_score: number
  max_possible_score: number
  percentile: number
  rank: number
  total_in_cohort: number
  cluster_id: number
  confidence: number
  flagged_for_review: boolean
  flag_reason: string | null
  criterion_scores: CriterionScore[]
  narrative_feedback: string
  cohort_comparison_summary: string
  evaluated_at: string
}

export interface SubmissionContentResponse {
  id: string
  job_id: string
  content: string
  content_type: string
  metadata_json: Record<string, unknown>
  created_at: string
}

export interface JobResultsResponse {
  job_id: string
  status: JobStatus
  results: SubmissionResult[]
  total_count: number
  completed_count: number
}

export interface AnchorCriterion {
  name: string
  weight: number
  max_score: number
}

export interface AnchorEntry {
  id: string
  content: string
  human_scores: Record<string, number>
  final_score: number
  difficulty: "weak" | "developing" | "proficient" | "strong" | "exemplary"
  notes?: string
}

export interface AnchorSetSummary {
  anchor_set_id: string
  content_type: ContentType
  description: string
  anchor_count: number
  rubric_name: string
  version: number
  created_at: string
  difficulty_distribution: Record<string, number>
}

export interface AnchorSetCreate {
  anchor_set_id: string
  content_type: ContentType
  description: string
  version: number
  anchors: AnchorEntry[]
  rubric_name: string
  rubric_criteria: AnchorCriterion[]
}

export interface CalibrationPreviewResponse {
  anchor_mean: number
  cohort_mean: number
  shift: number
  max_possible_score: number
  sample_before: number[]
  sample_after: number[]
  interpretation: string
}

export interface ValidationResponse {
  anchor_set_id: string
  is_valid: boolean
  errors: string[]
  warnings: string[]
  anchor_count: number
  difficulty_distribution: Record<string, number>
}

// SSE event types
export type SSEEventType =
  | "connected" | "progress" | "result" | "error" | "done"

export interface SSEEvent {
  event: SSEEventType
  job_id: string
  timestamp: string
  // progress event
  status?: JobStatus
  completed_count?: number
  submission_count?: number
  progress_percent?: number
  // result event
  result?: SubmissionResult
  // error event
  error_message?: string
  // done event
  total_results?: number
}
