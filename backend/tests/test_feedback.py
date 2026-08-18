import pytest
import json
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage
from app.pipeline.nodes.feedback import feedback_node

@pytest.fixture
def base_state():
    return {
        "job_id": "job123",
        "content_type": "essay",
        "rubric": {},
        "submissions": [
            {"id": "sub1", "content": "Essay 1 content.", "cluster_id": 1},
            {"id": "sub2", "content": "Essay 2 content... " * 1000, "cluster_id": 1}, # very long
            {"id": "sub3", "content": "Essay 3 content.", "cluster_id": 2}
        ],
        "scores": [
            {"submission_id": "sub1", "cluster_id": 1, "individual_scores": [], "percentile": 50.0},
            {"submission_id": "sub2", "cluster_id": 1, "individual_scores": [], "percentile": 60.0},
            {"submission_id": "sub3", "cluster_id": 2, "individual_scores": [], "percentile": 70.0}
        ],
        "cluster_summaries": {
            1: "Cluster 1 context"
        },
        "errors": []
    }

@pytest.mark.asyncio
async def test_feedback_node_success(base_state):
    valid_json = {
        "narrative_feedback": "Great job.",
        "cohort_comparison_summary": "Top half."
    }
    
    with patch("app.pipeline.nodes.feedback.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        
        result = await feedback_node(base_state)
        
        assert len(result["scores"]) == 3
        for score in result["scores"]:
            assert score["narrative_feedback"] == "Great job."
            assert score["cohort_comparison_summary"] == "Top half."

@pytest.mark.asyncio
async def test_feedback_node_llm_error(base_state):
    with patch("app.pipeline.nodes.feedback.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.side_effect = Exception("LLM Error")
        
        result = await feedback_node(base_state)
        
        assert len(result["errors"]) == 3
        for score in result["scores"]:
            assert "Feedback generation failed" in score["narrative_feedback"]
            assert score["cohort_comparison_summary"] == ""

@pytest.mark.asyncio
async def test_feedback_content_preview_truncation(base_state):
    valid_json = {
        "narrative_feedback": "Great job.",
        "cohort_comparison_summary": "Top half."
    }
    
    with patch("app.pipeline.nodes.feedback.llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.ainvoke.return_value = AIMessage(content=json.dumps(valid_json))
        
        await feedback_node(base_state)
        
        # Verify truncation
        # The prompt strings for sub2 must have max 2000 chars of sub content
        # Check all calls made to ainvoke
        for call in mock_llm.ainvoke.call_args_list:
            args = call[0][0] # list of messages
            user_msg = args[1].content
            
            # The preview length logic: "Submission Content (Preview):\n{submission_content}\n\n"
            # It's hard to precisely calculate string idx, but the content shouldn't exceed approx 2000+prompt
            assert len(user_msg) < 3000 # Since content is max 2000, entire prompt should easily be < 3000
