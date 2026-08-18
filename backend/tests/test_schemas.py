import pytest
from pydantic import ValidationError
from app.schemas.submission import BatchSubmitRequest, SubmissionItem
from app.schemas.rubric import RubricDefinition
from app.schemas.job import JobStatus
from app.schemas.result import SubmissionResult
from datetime import datetime, timezone

def test_valid_batch_submit(sample_rubric, sample_submission_batch):
    req = BatchSubmitRequest(
        submissions=sample_submission_batch,
        rubric=sample_rubric,
        content_type="essay"
    )
    assert req.content_type == "essay"

def test_duplicate_submission_ids(sample_rubric, sample_submission_batch):
    batch = sample_submission_batch.copy()
    batch.append({"id": "sub_1", "content": "dup", "content_type": "essay"})
    
    with pytest.raises(ValidationError):
        BatchSubmitRequest(
            submissions=batch,
            rubric=sample_rubric,
            content_type="essay"
        )

def test_invalid_rubric_weights():
    with pytest.raises(ValidationError):
        RubricDefinition(
            name="Bad",
            description="Bad",
            criteria=[
                {"name": "A", "description": "A", "weight": 0.5},
                {"name": "B", "description": "B", "weight": 0.4}
            ]
        )

def test_content_type_enum():
    from app.schemas.submission import ContentType
    assert ContentType.ESSAY == "essay"
    assert ContentType.CODE == "code"

def test_job_status_enum():
    assert JobStatus.QUEUED == "queued"
    assert JobStatus.COMPLETED == "completed"

def test_submission_result_validation():
    now = datetime.now(timezone.utc)
    res = SubmissionResult(
        submission_id="sub_1",
        job_id="uuid",
        final_score=8.5,
        max_possible_score=10.0,
        percentile=85.0,
        rank=1,
        total_in_cohort=10,
        cluster_id=1,
        confidence=0.9,
        flagged_for_review=False,
        flag_reason=None,
        criterion_scores=[{
            "criterion_name": "Grammar",
            "score": 8.5,
            "max_score": 10.0,
            "reasoning": "Good."
        }],
        narrative_feedback="Good job",
        cohort_comparison_summary="Above average",
        evaluated_at=now
    )
    assert res.submission_id == "sub_1"
