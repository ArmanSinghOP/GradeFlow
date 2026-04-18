"""
Integration tests run against a real database and Redis/Celery via docker-compose.
Ensure docker-compose up is running before executing these tests.
Run with: pytest tests/ -m integration
"""
import pytest
import asyncio
import json
import uuid
import numpy as np
from httpx import AsyncClient

@pytest.fixture
def mock_openai(monkeypatch):
    from langchain_core.messages import AIMessage
    
    class FakeEmbeddings:
        class FakeData:
            def __init__(self):
                # deterministic fake embeddings
                np.random.seed(42)
                self.embedding = np.random.rand(1536).tolist()
                
    class FakeAio:
        class FakeCreate:
            async def create(self, input, model, *args, **kwargs):
                class Resp:
                    data = [type("Data", (object,), {"embedding": np.random.rand(1536).tolist()}) for _ in input]
                return Resp()
        embeddings = FakeCreate()
                
    async def fake_ainvoke(*args, **kwargs):
        return AIMessage(content="""```json
{
  "confidence": 0.9,
  "flag_for_review": false,
  "flag_reason": "",
  "criterion_scores": [
    {"criterion_name": "Grammar", "score": 8, "max_score": 10, "reasoning": "Good"},
    {"criterion_name": "Content", "score": 7, "max_score": 10, "reasoning": "Good"}
  ],
  "adjustments": [],
  "comparison_summary": "Summary",
  "narrative_feedback": "Good job",
  "cohort_comparison_summary": "Summary"
}
```""")

    from langchain_openai import ChatOpenAI
    import app.embeddings.engine
    
    monkeypatch.setattr(app.embeddings.engine, "AsyncOpenAI", lambda *args, **kwargs: FakeAio())
    monkeypatch.setattr(ChatOpenAI, "ainvoke", fake_ainvoke)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_pipeline_queued_to_completed(async_client: AsyncClient, mock_openai):
    payload = {
        "content_type": "essay",
        "rubric": {
            "name": "General Essay",
            "criteria": [
                {"name": "Grammar", "description": "grammar", "max_score": 10, "weight": 0.5},
                {"name": "Content", "description": "content", "max_score": 10, "weight": 0.5}
            ]
        },
        "submissions": [
            {"id": f"sub_{i}", "content": f"Test content {i}"} for i in range(5)
        ]
    }
    
    resp = await async_client.post("/api/v1/evaluate", json=payload)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    
    for _ in range(60):
        resp = await async_client.get(f"/api/v1/jobs/{job_id}")
        if resp.json()["status"] == "COMPLETED":
            break
        elif resp.json()["status"] == "FAILED":
            pytest.fail(f"Job failed: {resp.json().get('error_message')}")
        await asyncio.sleep(2)
        
    resp = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert resp.json()["status"] == "COMPLETED"
    
    resp = await async_client.get(f"/api/v1/results/{job_id}")
    results = resp.json()["results"]
    assert len(results) == 5
    for r in results:
        assert r["final_score"] is not None
        assert r["percentile"] is not None
        assert r["rank"] is not None
        
    ranks = sorted([r["rank"] for r in results])
    unique_ranks = sorted(list(set(ranks)))
    assert len(unique_ranks) >= 1

@pytest.mark.integration
@pytest.mark.asyncio
async def test_pipeline_with_anchor_set(async_client: AsyncClient, mock_openai):
    anchor_payload = {
        "content_type": "essay",
        "rubric": {
            "name": "General Essay",
            "criteria": [
                {"name": "Grammar", "description": "grammar", "max_score": 10, "weight": 0.5},
                {"name": "Content", "description": "content", "max_score": 10, "weight": 0.5}
            ]
        },
        "anchors": [
            {
                "id": f"anchor_{i}",
                "content": "Anchor content",
                "human_scores": {"Grammar": 8, "Content": 8},
                "final_score": 80.0
            } for i in range(2)
        ]
    }
    resp = await async_client.post("/api/v1/anchors", json=anchor_payload)
    assert resp.status_code == 200
    anchor_set_id = resp.json()["id"]
    
    payload = {
        "content_type": "essay",
        "anchor_set_id": anchor_set_id,
        "rubric": anchor_payload["rubric"],
        "submissions": [
            {"id": "sub_1", "content": "hello"}
        ]
    }
    
    resp = await async_client.post("/api/v1/evaluate", json=payload)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    
    for _ in range(60):
        resp = await async_client.get(f"/api/v1/jobs/{job_id}")
        if resp.json()["status"] == "COMPLETED":
            break
        await asyncio.sleep(2)
        
    resp = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert resp.json()["status"] == "COMPLETED"
    assert resp.json()["anchor_set_id"] == anchor_set_id

@pytest.mark.integration
@pytest.mark.asyncio
async def test_pipeline_invalid_rubric_rejected(async_client: AsyncClient):
    payload = {
        "content_type": "essay",
        "rubric": {
            "name": "Invalid",
            "criteria": [
                {"name": "Grammar", "description": "grammar", "max_score": 10, "weight": 0.4},
                {"name": "Content", "description": "content", "max_score": 10, "weight": 0.5}
            ]
        },
        "submissions": [{"id": "sub_1", "content": "1"}]
    }
    resp = await async_client.post("/api/v1/evaluate", json=payload)
    assert resp.status_code == 422

@pytest.mark.integration
@pytest.mark.asyncio
async def test_pipeline_duplicate_ids_rejected(async_client: AsyncClient):
    payload = {
        "content_type": "essay",
        "rubric": {
            "name": "General Essay",
            "criteria": [
                {"name": "Grammar", "description": "grammar", "max_score": 10, "weight": 0.5},
                {"name": "Content", "description": "content", "max_score": 10, "weight": 0.5}
            ]
        },
        "submissions": [{"id": "sub_1", "content": "1"}, {"id": "sub_1", "content": "1"}]
    }
    resp = await async_client.post("/api/v1/evaluate", json=payload)
    assert resp.status_code == 422

@pytest.mark.integration
@pytest.mark.asyncio
async def test_pipeline_job_status_progression(async_client: AsyncClient, mock_openai):
    payload = {
        "content_type": "essay",
        "rubric": {
            "name": "General Essay",
            "criteria": [
                {"name": "Grammar", "description": "grammar", "max_score": 10, "weight": 0.5},
                {"name": "Content", "description": "content", "max_score": 10, "weight": 0.5}
            ]
        },
        "submissions": [
            {"id": f"sub_{i}", "content": f"Test content {i}"} for i in range(2)
        ]
    }
    resp = await async_client.post("/api/v1/evaluate", json=payload)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    
    statuses = []
    for _ in range(60):
        resp = await async_client.get(f"/api/v1/jobs/{job_id}")
        st = resp.json()["status"]
        if not statuses or statuses[-1] != st:
            statuses.append(st)
        if st in ["COMPLETED", "FAILED"]:
            break
        await asyncio.sleep(0.5)
        
    assert statuses[0] == "QUEUED"
    assert statuses[-1] == "COMPLETED"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_pipeline_results_streaming(async_client: AsyncClient, mock_openai):
    payload = {
        "content_type": "essay",
        "rubric": {
            "name": "General Essay",
            "criteria": [
                {"name": "Grammar", "description": "grammar", "max_score": 10, "weight": 0.5},
                {"name": "Content", "description": "content", "max_score": 10, "weight": 0.5}
            ]
        },
        "submissions": [
            {"id": f"sub_{i}", "content": f"Test content {i}"} for i in range(2)
        ]
    }
    resp = await async_client.post("/api/v1/evaluate", json=payload)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    
    events = []
    async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = json.loads(line[6:].strip())
                events.append(data)
                if data["event"] in ["done", "error"]:
                    break
                    
    assert events[0]["event"] == "connected"
    assert events[-1]["event"] == "done"
    result_events = [e for e in events if e["event"] == "result"]
    assert len(result_events) == 2
