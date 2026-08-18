import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}

@pytest.mark.asyncio
async def test_submit_batch_valid(async_client: AsyncClient, sample_rubric, sample_submission_batch):
    payload = {
        "submissions": sample_submission_batch,
        "rubric": sample_rubric,
        "content_type": "essay"
    }
    response = await async_client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"

@pytest.mark.asyncio
async def test_submit_batch_duplicate_ids(async_client: AsyncClient, sample_rubric, sample_submission_batch):
    batch = sample_submission_batch.copy()
    batch.append({"id": "sub_1", "content": "dup", "content_type": "essay"})
    payload = {
        "submissions": batch,
        "rubric": sample_rubric,
        "content_type": "essay"
    }
    response = await async_client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 422 

@pytest.mark.asyncio
async def test_submit_batch_invalid_rubric(async_client: AsyncClient, sample_submission_batch):
    rubric = {
        "name": "Bad Rubric",
        "description": "...",
        "criteria": [{"name": "A", "description": "a", "weight": 0.5}]
    }
    payload = {
        "submissions": sample_submission_batch,
        "rubric": rubric,
        "content_type": "essay"
    }
    response = await async_client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 422 

@pytest.mark.asyncio
async def test_get_job_unknown(async_client: AsyncClient):
    import uuid
    job_id = str(uuid.uuid4())
    response = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_job_valid(async_client: AsyncClient, sample_rubric, sample_submission_batch):
    payload = {
        "submissions": sample_submission_batch,
        "rubric": sample_rubric,
        "content_type": "essay"
    }
    post_res = await async_client.post("/api/v1/evaluate", json=payload)
    job_id = post_res.json()["job_id"]
    
    get_res = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "queued"

@pytest.mark.asyncio
async def test_get_results_not_completed(async_client: AsyncClient, sample_rubric, sample_submission_batch):
    payload = {
        "submissions": sample_submission_batch,
        "rubric": sample_rubric,
        "content_type": "essay"
    }
    post_res = await async_client.post("/api/v1/evaluate", json=payload)
    job_id = post_res.json()["job_id"]
    
    res = await async_client.get(f"/api/v1/results/{job_id}")
    assert res.status_code == 400
    assert res.json()["detail"] == "Job is not completed"
