from typing import get_type_hints
from app.pipeline.state import GradeFlowState, SubmissionScoreDict, CriterionScoreDict

def test_gradeflow_state_construction():
    state: GradeFlowState = {
        "job_id": "job123",
        "content_type": "essay",
        "rubric": {},
        "anchor_set_id": None,
        "submissions": [],
        "scores": [],
        "cluster_ids": [],
        "anchor_scores": [],
        "cluster_summaries": {},
        "errors": [],
        "current_node": "start"
    }
    assert "job_id" in state
    assert "scores" in state
    assert state["scores"] == []

def test_submission_score_dict_fields():
    score: SubmissionScoreDict = {
        "submission_id": "sub123",
        "cluster_id": 1,
        "individual_scores": [],
        "raw_total": 8.5,
        "normalised_score": 85.0,
        "percentile": 90.0,
        "rank": 1,
        "confidence": 0.9,
        "flagged_for_review": False,
        "flag_reason": None,
        "narrative_feedback": "Good",
        "cohort_comparison_summary": "Top 10%"
    }
    assert isinstance(score["raw_total"], float)
    assert isinstance(score["percentile"], float)
    assert isinstance(score["rank"], int)

def test_criterion_score_dict_fields():
    crit: CriterionScoreDict = {
        "criterion_name": "Grammar",
        "score": 4.5,
        "max_score": 5.0,
        "reasoning": "A reasoning string"
    }
    assert "criterion_name" in crit
    assert "score" in crit
    assert "max_score" in crit
    assert "reasoning" in crit
