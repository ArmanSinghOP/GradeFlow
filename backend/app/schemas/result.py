from pydantic import BaseModel
from datetime import datetime
from app.schemas.job import JobStatus

class CriterionScore(BaseModel):
    criterion_name: str
    score: float
    max_score: float
    reasoning: str

class SubmissionResult(BaseModel):
    submission_id: str
    job_id: str
    final_score: float
    max_possible_score: float
    percentile: float
    rank: int
    total_in_cohort: int
    cluster_id: int
    confidence: float
    flagged_for_review: bool
    flag_reason: str | None
    criterion_scores: list[CriterionScore]
    narrative_feedback: str
    cohort_comparison_summary: str
    evaluated_at: datetime

class JobResultsResponse(BaseModel):
    job_id: str
    status: JobStatus
    results: list[SubmissionResult]
    total_count: int
    completed_count: int
