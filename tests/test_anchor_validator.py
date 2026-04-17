import pytest
from app.anchors.validator import validate_anchor_set, compute_calibration_preview

@pytest.fixture
def valid_anchor_data():
    return {
        "anchor_set_id": "test-set",
        "content_type": "essay",
        "description": "Valid set",
        "version": 1,
        "rubric_name": "Test Rubric",
        "rubric_criteria": [
            {"name": "Criteria 1", "weight": 0.5, "max_score": 10.0},
            {"name": "Criteria 2", "weight": 0.3, "max_score": 10.0},
            {"name": "Criteria 3", "weight": 0.2, "max_score": 5.0}
        ],
        "anchors": [
            {"id": "a1", "content": "c", "human_scores": {"Criteria 1": 1.0, "Criteria 2": 1.0, "Criteria 3": 1.0}, "final_score": 1.0, "difficulty": "weak"},
            {"id": "a2", "content": "c", "human_scores": {"Criteria 1": 2.0, "Criteria 2": 2.0, "Criteria 3": 2.0}, "final_score": 2.0, "difficulty": "weak"},
            {"id": "a3", "content": "c", "human_scores": {"Criteria 1": 3.0, "Criteria 2": 3.0, "Criteria 3": 3.0}, "final_score": 3.0, "difficulty": "developing"},
            {"id": "a4", "content": "c", "human_scores": {"Criteria 1": 4.0, "Criteria 2": 4.0, "Criteria 3": 4.0}, "final_score": 4.0, "difficulty": "developing"},
            {"id": "a5", "content": "c", "human_scores": {"Criteria 1": 5.0, "Criteria 2": 5.0, "Criteria 3": 5.0}, "final_score": 5.0, "difficulty": "proficient"},
            {"id": "a6", "content": "c", "human_scores": {"Criteria 1": 6.0, "Criteria 2": 6.0, "Criteria 3": 5.0}, "final_score": 5.8, "difficulty": "proficient"},
            {"id": "a7", "content": "c", "human_scores": {"Criteria 1": 7.0, "Criteria 2": 7.0, "Criteria 3": 5.0}, "final_score": 6.6, "difficulty": "strong"},
            {"id": "a8", "content": "c", "human_scores": {"Criteria 1": 8.0, "Criteria 2": 8.0, "Criteria 3": 5.0}, "final_score": 7.4, "difficulty": "strong"},
            {"id": "a9", "content": "c", "human_scores": {"Criteria 1": 10.0, "Criteria 2": 9.0, "Criteria 3": 5.0}, "final_score": 8.7, "difficulty": "exemplary"},
            {"id": "a10", "content": "c", "human_scores": {"Criteria 1": 10.0, "Criteria 2": 10.0, "Criteria 3": 5.0}, "final_score": 9.0, "difficulty": "exemplary"}
        ]
    }

def test_valid_anchor_set_passes(valid_anchor_data):
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is True
    assert len(result.errors) == 0

def test_anchor_set_id_mismatch_fails(valid_anchor_data):
    valid_anchor_data["anchor_set_id"] = "wrong-id"
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False
    assert any("anchor_set_id" in err for err in result.errors)

def test_invalid_anchor_set_id_characters(valid_anchor_data):
    valid_anchor_data["anchor_set_id"] = "test set/evil"
    result = validate_anchor_set(valid_anchor_data, "test set/evil")
    assert result.is_valid is False

def test_minimum_anchor_count_error(valid_anchor_data):
    valid_anchor_data["anchors"] = valid_anchor_data["anchors"][:4]
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False
    assert any("at least 5 anchors" in err for err in result.errors)

def test_minimum_anchor_count_warning(valid_anchor_data):
    valid_anchor_data["anchors"] = valid_anchor_data["anchors"][:7]
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is True
    assert len(result.warnings) > 0

def test_duplicate_anchor_ids_fail(valid_anchor_data):
    valid_anchor_data["anchors"][1]["id"] = "a1"
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_rubric_weights_must_sum_to_one(valid_anchor_data):
    valid_anchor_data["rubric_criteria"][0]["weight"] = 0.6
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_missing_criterion_in_human_scores(valid_anchor_data):
    del valid_anchor_data["anchors"][0]["human_scores"]["Criteria 1"]
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_score_out_of_range(valid_anchor_data):
    valid_anchor_data["anchors"][0]["human_scores"]["Criteria 1"] = 15.0
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_final_score_mismatch(valid_anchor_data):
    valid_anchor_data["anchors"][0]["final_score"] = 99.0
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_invalid_difficulty_value(valid_anchor_data):
    valid_anchor_data["anchors"][0]["difficulty"] = "excellent"
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_insufficient_difficulty_coverage(valid_anchor_data):
    for a in valid_anchor_data["anchors"]:
        a["difficulty"] = "strong"
    result = validate_anchor_set(valid_anchor_data, "test-set")
    assert result.is_valid is False

def test_calibration_preview_shift_up(valid_anchor_data):
    # final scores: 1, 2, 3, 4, 5, 5.8, 6.6, 7.4, 8.7, 9 -> sum=52.5 -> mean=5.25
    # let's set final scores simply to make math easy
    for i in range(10): valid_anchor_data["anchors"][i]["final_score"] = 8.0 # anchor mean 8.0
    
    sample = [5.0, 6.0, 7.0] # cohort mean 6.0 -> shift +2.0
    preview = compute_calibration_preview(valid_anchor_data, sample)
    assert preview["shift"] == 2.0
    assert preview["sample_after"] == [7.0, 8.0, 9.0]

def test_calibration_preview_shift_down(valid_anchor_data):
    for i in range(10): valid_anchor_data["anchors"][i]["final_score"] = 4.0 # anchor mean 4.0
    sample = [7.0, 8.0, 9.0] # cohort mean 8.0 -> shift -4.0
    preview = compute_calibration_preview(valid_anchor_data, sample)
    assert preview["shift"] == -4.0
    assert preview["sample_after"][0] < preview["sample_before"][0]

def test_calibration_preview_clamp(valid_anchor_data):
    for i in range(10): valid_anchor_data["anchors"][i]["final_score"] = 10.0 # max score -> anchor mean 10.0
    sample = [9.5] # mean 9.5 -> shift +0.5
    preview = compute_calibration_preview(valid_anchor_data, sample)
    # the max possible from our valid_anchor_data is 0.5*10 + 0.3*10 + 0.2*5 = 5+3+1 = 9.0
    # shift +0.5 applying to 9.5 -> 10.0 => clamped to 9.0
    assert preview["sample_after"] == [9.0]

def test_calibration_preview_interpretation_up(valid_anchor_data):
    for i in range(10): valid_anchor_data["anchors"][i]["final_score"] = 8.0 
    sample = [5.0, 6.0, 7.0]
    preview = compute_calibration_preview(valid_anchor_data, sample)
    assert "UP" in preview["interpretation"]

def test_calibration_preview_interpretation_not_significant(valid_anchor_data):
    for i in range(10): valid_anchor_data["anchors"][i]["final_score"] = 6.0 
    sample = [5.5, 6.0, 5.6] # cohort mean 5.7 -> shift 0.3
    preview = compute_calibration_preview(valid_anchor_data, sample)
    assert "not shift scores significantly" in preview["interpretation"]
