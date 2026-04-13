from enum import Enum
from typing import Any
from pydantic import BaseModel, model_validator
from app.schemas.rubric import RubricDefinition
from datetime import datetime

class ContentType(str, Enum):
    ESSAY = "essay"
    CODE = "code"
    REPORT = "report"
    INTERVIEW = "interview"

class SubmissionItem(BaseModel):
    id: str
    content: str
    content_type: ContentType
    metadata: dict[str, Any] = {}

class BatchSubmitRequest(BaseModel):
    submissions: list[SubmissionItem]
    rubric: RubricDefinition
    anchor_set_id: str | None = None
    content_type: ContentType

    @model_validator(mode='after')
    def validate_submissions(self):
        if not (1 <= len(self.submissions) <= 10000):
            raise ValueError("1 to 10000 submissions are required.")
        ids = [item.id for item in self.submissions]
        if len(ids) != len(set(ids)):
            raise ValueError("All submission IDs must be unique within the batch.")
        return self

class BatchSubmitResponse(BaseModel):
    job_id: str
    status: str
    submission_count: int
    estimated_minutes: int
    created_at: datetime
