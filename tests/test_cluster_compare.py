import pytest
import json
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage
from app.pipeline.nodes.cluster_compare import cluster_compare_node

@pytest.fixture
def base_state():
    return {
        "job_id": "job123",
        "content_type": "essay",
        "rubric": {
            "criteria": [
                {"name": "Structure", "max_score": 10.0, "weight": 1.0}
            ]
        },
        "submissions": [],
        "scores": [],
        "cluster_summaries": {},
        "errors": []
    }

@pytest.mark.asyncio
async def test_cluster_compare_single_window(base_state):
    base_state["submissions"] = [{"id": f"sub{i}", "content": f"Essay {i}", "cluster_id": 1} for i in range(5)]
    base_state["scores"] = [
        {"submission_id": f"sub{i}", "cluster_id": 1, "individual_scores": [{"criterion_name": "Structure", "score": float(i)}], "raw_total": float(i)}
        for i in range(5)
    ]
    
    valid_json = {
        "adjustments": [
            {"submission_id": "sub0", "criterion_name": "Structure", "adjusted_score": 2.0, "adjustment_reason": "Too low"}
        ],
        "comparison_summary": "Cluster 1 is varied."
    }
    
    with patch("app.pipeline.nodes.cluster_compare.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        
        result = await cluster_compare_node(base_state)
        
        assert result["scores"][0]["individual_scores"][0]["score"] == 2.0
        assert result["scores"][0]["raw_total"] == 2.0
        assert result["cluster_summaries"][1] == "Cluster 1 is varied."

@pytest.mark.asyncio
async def test_cluster_compare_sliding_window(base_state):
    base_state["submissions"] = [{"id": f"sub{i}", "content": f"Essay {i}", "cluster_id": 1} for i in range(15)]
    base_state["scores"] = [
        {"submission_id": f"sub{i}", "cluster_id": 1, "individual_scores": [{"criterion_name": "Structure", "score": 5.0}], "raw_total": 5.0}
        for i in range(15)
    ]
    
    valid_json = {
        "adjustments": [],
        "comparison_summary": "Summary"
    }
    
    with patch("app.pipeline.nodes.cluster_compare.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        
        result = await cluster_compare_node(base_state)
        
        # 15 items, window=10, overlap=3
        # window 1: 0-9
        # window 2: 7-16 (actually 7-15 since only 15 exist)
        # So 3 calls
        assert mock_llm.ainvoke.call_count == 3
        assert len(result["scores"]) == 15

@pytest.mark.asyncio
async def test_cluster_compare_score_clamping(base_state):
    base_state["submissions"] = [{"id": "sub1", "content": "Essay", "cluster_id": 1}]
    base_state["scores"] = [{"submission_id": "sub1", "cluster_id": 1, "individual_scores": [{"criterion_name": "Structure", "score": 5.0}], "raw_total": 5.0}]
    
    valid_json = {
        "adjustments": [
            {"submission_id": "sub1", "criterion_name": "Structure", "adjusted_score": 15.0, "adjustment_reason": "Amazing!"}
        ]
    }
    
    with patch("app.pipeline.nodes.cluster_compare.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        result = await cluster_compare_node(base_state)
        # Clamped to 10.0 since max_score = 10.0
        assert result["scores"][0]["individual_scores"][0]["score"] == 10.0

@pytest.mark.asyncio
async def test_cluster_compare_overlap_averaging(base_state):
    base_state["submissions"] = [{"id": f"sub{i}", "content": f"Essay {i}", "cluster_id": 1} for i in range(15)]
    base_state["scores"] = [
        {"submission_id": f"sub{i}", "cluster_id": 1, "individual_scores": [{"criterion_name": "Structure", "score": 5.0}], "raw_total": 5.0}
        for i in range(15)
    ]
    
    # We will simulate mock side effect depending on window
    def side_effect(*args, **kwargs):
        content = args[0][1].content # HumanMessage
        if "sub8" not in content:
            return AIMessage(content=json.dumps({"adjustments": []}))
        if "sub0" in content: # first window
            val = {"adjustments": [{"submission_id": "sub8", "criterion_name": "Structure", "adjusted_score": 7.0, "adjustment_reason": "W1"}]}
        else: # second window
            val = {"adjustments": [{"submission_id": "sub8", "criterion_name": "Structure", "adjusted_score": 9.0, "adjustment_reason": "W2"}]}
        return AIMessage(content=json.dumps(val))
        
    with patch("app.pipeline.nodes.cluster_compare.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.side_effect = side_effect
        result = await cluster_compare_node(base_state)
        
        # sub8 is in overlap (7-9), should average 7.0 and 9.0 -> 8.0
        score_sub8 = next(s for s in result["scores"] if s["submission_id"] == "sub8")
        assert score_sub8["individual_scores"][0]["score"] == 8.0

@pytest.mark.asyncio
async def test_cluster_compare_llm_error_skips_window(base_state):
    base_state["submissions"] = [{"id": f"sub{i}", "content": f"Essay {i}", "cluster_id": 1} for i in range(15)]
    base_state["scores"] = [
        {"submission_id": f"sub{i}", "cluster_id": 1, "individual_scores": [{"criterion_name": "Structure", "score": 5.0}], "raw_total": 5.0}
        for i in range(15)
    ]
    
    def side_effect(*args, **kwargs):
        content = args[0][1].content
        if "sub0" in content:
            raise Exception("LLM Error")
        elif "sub8" in content:
            val = {"adjustments": [{"submission_id": "sub8", "criterion_name": "Structure", "adjusted_score": 9.0, "adjustment_reason": "W2"}]}
            return AIMessage(content=json.dumps(val))
        return AIMessage(content=json.dumps({"adjustments": []}))
            
    with patch("app.pipeline.nodes.cluster_compare.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.side_effect = side_effect
        result = await cluster_compare_node(base_state)
        
        # Error list should not be empty
        assert len(result["errors"]) > 0
        
        # Sub8 got 9.0 from the second window which succeeded
        score_sub8 = next(s for s in result["scores"] if s["submission_id"] == "sub8")
        assert score_sub8["individual_scores"][0]["score"] == 9.0
