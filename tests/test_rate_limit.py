import pytest
import asyncio
from httpx import AsyncClient
from app.config import settings

@pytest.fixture(autouse=True)
def clear_rate_limit_history():
    from app.middleware.rate_limit import request_history
    request_history.clear()

@pytest.mark.asyncio
async def test_rate_limit_not_triggered_under_limit(async_client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_requests", 60)
    for _ in range(5):
        resp = await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []})
        assert resp.status_code != 429

@pytest.mark.asyncio
async def test_rate_limit_triggered_over_limit(async_client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_requests", 3)
    for _ in range(3):
        await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []})
    resp = await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []})
    assert resp.status_code == 429
    assert "retry_after" in resp.json()

@pytest.mark.asyncio
async def test_rate_limit_resets_after_window(async_client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_requests", 2)
    monkeypatch.setattr(settings, "rate_limit_window", 1)
    await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []})
    await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []})
    await asyncio.sleep(1.1)
    resp = await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []})
    assert resp.status_code != 429

@pytest.mark.asyncio
async def test_rate_limit_does_not_apply_to_jobs_endpoint(async_client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_requests", 1)
    for _ in range(5):
        resp = await async_client.get("/api/v1/jobs")
        assert resp.status_code != 429

@pytest.mark.asyncio
async def test_rate_limit_per_ip(async_client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_requests", 3)
    
    for _ in range(3):
        await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []}, headers={"X-Forwarded-For": "1.1.1.1"})
        
    resp_1 = await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []}, headers={"X-Forwarded-For": "1.1.1.1"})
    assert resp_1.status_code == 429
    
    resp_2 = await async_client.post("/api/v1/evaluate", json={"content_type": "essay", "rubric": {"name": "test", "criteria": []}, "submissions": []}, headers={"X-Forwarded-For": "2.2.2.2"})
    assert resp_2.status_code != 429
