import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage
from app.pipeline.nodes.individual_score import individual_score_node

@pytest.fixture
def base_state():
    return {
        "job_id": "job123",
        "content_type": "essay",
        "rubric": {
            "criteria": [
                {"name": "Structure", "max_score": 10.0, "weight": 0.6},
                {"name": "Evidence", "max_score": 10.0, "weight": 0.4}
            ]
        },
        "anchor_set_id": None,
        "submissions": [
            {"id": "sub1", "content": "Essay 1", "cluster_id": 1},
            {"id": "sub2", "content": "Essay 2", "cluster_id": 1},
            {"id": "sub3", "content": "Essay 3", "cluster_id": 2}
        ],
        "scores": [],
        "cluster_ids": [1, 2],
        "anchor_scores": [],
        "cluster_summaries": {},
        "errors": [],
        "current_node": "start"
    }

@pytest.mark.asyncio
async def test_individual_score_node_success(base_state):
    valid_json = {
        "criterion_scores": [
            {"criterion_name": "Structure", "score": 8.0, "max_score": 10.0, "reasoning": "Good structure."},
            {"criterion_name": "Evidence", "score": 6.0, "max_score": 10.0, "reasoning": "Okay evidence."}
        ],
        "confidence": 0.85,
        "flag_for_review": False,
        "flag_reason": None
    }
    
    with patch("app.pipeline.nodes.individual_score.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        
        result = await individual_score_node(base_state)
        
        assert "scores" in result
        assert len(result["scores"]) == 3
        for score in result["scores"]:
            assert len(score["individual_scores"]) == 2
            assert score["confidence"] == 0.85
            assert score["flagged_for_review"] is False

@pytest.mark.asyncio
async def test_individual_score_node_llm_error(base_state):
    base_state["submissions"] = base_state["submissions"][:2]
    
    with patch("app.pipeline.nodes.individual_score.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.side_effect = Exception("LLM error")
        
        result = await individual_score_node(base_state)
        
        assert "scores" in result
        assert len(result["scores"]) == 2
        for score in result["scores"]:
            assert score["flagged_for_review"] is True
            assert score["flag_reason"] == "Scoring failed — manual review required"
            assert score["confidence"] == 0.0
        assert len(result["errors"]) > 0

@pytest.mark.asyncio
async def test_individual_score_semaphore_limits_concurrency(base_state):
    base_state["submissions"] = [{"id": f"sub{i}", "content": f"Essay {i}", "cluster_id": 1} for i in range(20)]
    
    async def mock_invoke_sleep(*args, **kwargs):
        await asyncio.sleep(0.01)
        valid_json = {
            "criterion_scores": [],
            "confidence": 0.9,
            "flag_for_review": False,
            "flag_reason": None
        }
        return AIMessage(content=json.dumps(valid_json))
        
    with patch("app.pipeline.nodes.individual_score.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.side_effect = mock_invoke_sleep
        result = await individual_score_node(base_state)
        assert len(result["scores"]) == 20

@pytest.mark.asyncio
async def test_raw_total_computation(base_state):
    base_state["submissions"] = base_state["submissions"][:1]
    
    valid_json = {
        "criterion_scores": [
            {"criterion_name": "Structure", "score": 8.0, "max_score": 10.0, "reasoning": "R1"},
            {"criterion_name": "Evidence", "score": 6.0, "max_score": 10.0, "reasoning": "R2"}
        ],
        "confidence": 0.9,
        "flag_for_review": False,
        "flag_reason": None
    }
    
    with patch("app.pipeline.nodes.individual_score.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        
        result = await individual_score_node(base_state)
        
        # 8.0 * 0.6 + 6.0 * 0.4 = 4.8 + 2.4 = 7.2
        assert abs(result["scores"][0]["raw_total"] - 7.2) < 0.0001
