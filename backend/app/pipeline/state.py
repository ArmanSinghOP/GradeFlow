from typing import TypedDict

class CriterionScoreDict(TypedDict):
    criterion_name: str
    score: float
    max_score: float
    reasoning: str

class SubmissionScoreDict(TypedDict):
    submission_id: str
    cluster_id: int
    individual_scores: list[CriterionScoreDict]
    raw_total: float
    normalised_score: float
    percentile: float
    rank: int
    confidence: float
    flagged_for_review: bool
    flag_reason: str | None
    narrative_feedback: str
    cohort_comparison_summary: str

class GradeFlowState(TypedDict):
    job_id: str
    content_type: str
    rubric: dict
    anchor_set_id: str | None
    submissions: list[dict]
    scores: list[SubmissionScoreDict]
    cluster_ids: list[int]
    anchor_scores: list[SubmissionScoreDict]
    cluster_summaries: dict[int, str]
    errors: list[str]
    current_node: str
