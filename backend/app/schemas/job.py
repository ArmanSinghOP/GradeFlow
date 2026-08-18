from enum import Enum
from datetime import datetime
from pydantic import BaseModel

class JobStatus(str, Enum):
    QUEUED = "queued"
    EMBEDDING = "embedding"
    CLUSTERING = "clustering"
    EVALUATING = "evaluating"
    NORMALISING = "normalising"
    GENERATING_FEEDBACK = "generating_feedback"
    COMPLETED = "completed"
    FAILED = "failed"

class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    submission_count: int
    completed_count: int
    cluster_count: int | None
    progress_percent: float
    created_at: datetime
    updated_at: datetime
    error_message: str | None = None
