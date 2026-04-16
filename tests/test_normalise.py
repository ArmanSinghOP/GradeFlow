import pytest
from app.pipeline.nodes.normalise import normalise_node

@pytest.fixture
def base_state():
    return {
        "job_id": "job123",
        "content_type": "essay",
        "rubric": {
            "criteria": [
                {"name": "Crit1", "max_score": 10.0, "weight": 1.0}
            ]
        },
        "scores": [],
        "errors": []
    }

@pytest.mark.asyncio
async def test_normalise_percentile_computation(base_state):
    scores = [
        {"submission_id": f"sub{i}", "raw_total": val, "normalised_score": 0.0, "flagged_for_review": False}
        for i, val in enumerate([5.0, 7.0, 8.0, 9.0])
    ]
    base_state["scores"] = scores
    
    result = await normalise_node(base_state)
    
    # max possible is 10.0
    # normalised scores = 50.0, 70.0, 80.0, 90.0
    s7 = next(s for s in result["scores"] if s["raw_total"] == 7.0)
    assert s7["percentile"] == 25.0

@pytest.mark.asyncio
async def test_normalise_rank_assignment(base_state):
    scores = [
        {"submission_id": f"sub{i}", "raw_total": val, "flagged_for_review": False}
        for i, val in enumerate([10.0, 9.0, 8.0, 7.0]) # already sorted desc
    ]
    base_state["scores"] = scores
    
    result = await normalise_node(base_state)
    
    for i, score in enumerate(result["scores"]):
        # 10.0 -> rank 1
        val = score["raw_total"]
        if val == 10.0: assert score["rank"] == 1
        elif val == 9.0: assert score["rank"] == 2
        elif val == 8.0: assert score["rank"] == 3
        elif val == 7.0: assert score["rank"] == 4

@pytest.mark.asyncio
async def test_normalise_dense_ranking_ties(base_state):
    scores = [
        {"submission_id": f"sub{i}", "raw_total": val, "flagged_for_review": False}
        for i, val in enumerate([9.0, 9.0, 7.0])
    ]
    base_state["scores"] = scores
    
    result = await normalise_node(base_state)
    ranks = [s["rank"] for s in result["scores"]]
    assert sorted(ranks) == [1, 1, 2] # Two tied at 1, next is 2

@pytest.mark.asyncio
async def test_normalise_anchor_adjustment(base_state):
    scores = [
        {"submission_id": f"sub{i}", "raw_total": val, "flagged_for_review": False}
        for i, val in enumerate([5.0, 7.0])
    ] # Mean = 6.0
    base_state["scores"] = scores
    base_state["anchor_scores"] = [
        {"raw_total": 8.0}
    ] # Anchor Mean = 8.0
    # shift = 8.0 - 6.0 = 2.0
    
    result = await normalise_node(base_state)
    
    # 5.0 -> 7.0 -> norm 70.0
    s5 = next(s for s in result["scores"] if s["submission_id"] == "sub0")
    assert s5["normalised_score"] == 70.0

@pytest.mark.asyncio
async def test_normalise_borderline_flagging(base_state):
    # max possible = 100 with a new rubric
    base_state["rubric"] = {"criteria": [{"name": "Crit1", "max_score": 100.0, "weight": 1.0}]}
    
    scores = [
        {"submission_id": "sub1", "raw_total": 79.5, "flagged_for_review": False}
    ]
    base_state["scores"] = scores
    
    result = await normalise_node(base_state)
    
    assert result["scores"][0]["flagged_for_review"] is True
    assert "grade boundary" in result["scores"][0]["flag_reason"]

@pytest.mark.asyncio
async def test_normalise_clamp_to_100(base_state):
    # Anchor shift causes exceed
    scores = [
        {"submission_id": "sub1", "raw_total": 9.0, "flagged_for_review": False}
    ] # mean = 9.0
    base_state["scores"] = scores
    base_state["anchor_scores"] = [
        {"raw_total": 12.0} # mean = 12.0 -> shift = 3.0
    ] 
    
    result = await normalise_node(base_state)
    # raw becomes 12.0, max is 10.0, normalised becomes 100.0
    assert result["scores"][0]["normalised_score"] == 100.0
