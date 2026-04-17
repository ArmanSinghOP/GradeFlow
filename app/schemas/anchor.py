from pydantic import BaseModel, conlist, Field
from typing import Dict, List, Literal

class AnchorCriterion(BaseModel):
    name: str
    weight: float
    max_score: float

class AnchorEntry(BaseModel):
    id: str
    content: str
    human_scores: Dict[str, float]
    final_score: float
    difficulty: Literal["weak", "developing", "proficient", "strong", "exemplary"]
    notes: str = ""

class AnchorSetCreate(BaseModel):
    anchor_set_id: str
    content_type: Literal["essay", "code", "report", "interview"]
    description: str
    version: int = 1
    anchors: List[AnchorEntry]
    rubric_name: str
    rubric_criteria: List[AnchorCriterion]

class AnchorSetSummary(BaseModel):
    anchor_set_id: str
    content_type: str
    description: str
    anchor_count: int
    rubric_name: str
    version: int
    created_at: str
    difficulty_distribution: Dict[str, int]

class AnchorListResponse(BaseModel):
    anchor_sets: List[AnchorSetSummary]
    total: int

class CalibrationPreviewRequest(BaseModel):
    sample_scores: conlist(float, min_length=1, max_length=1000)

class CalibrationPreviewResponse(BaseModel):
    anchor_mean: float
    cohort_mean: float
    shift: float
    max_possible_score: float
    sample_before: List[float]
    sample_after: List[float]
    interpretation: str

class ValidationResponse(BaseModel):
    anchor_set_id: str
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    anchor_count: int
    difficulty_distribution: Dict[str, int]
