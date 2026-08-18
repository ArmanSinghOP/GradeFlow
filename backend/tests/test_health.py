import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from sqlalchemy.exc import OperationalError

def setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control):
    # DB mock
    mock_db_execute.return_value = MagicMock()
    
    # Redis mock
    mock_redis_client = AsyncMock()
    mock_redis_client.ping.return_value = True
    mock_redis_from_url.return_value = mock_redis_client
    
    # Celery mock
    mock_inspect = MagicMock()
    mock_inspect.active.return_value = {"worker1@hostname": [{"id": "task1"}]}
    mock_celery_control.inspect.return_value = mock_inspect
    
    return mock_redis_client

@pytest.mark.asyncio
@patch("app.api.v1.endpoints.health.celery_app.control")
@patch("app.api.v1.endpoints.health.aioredis.from_url")
@patch("app.api.v1.endpoints.health.AsyncSession.execute")
async def test_health_all_healthy(mock_db_execute, mock_redis_from_url, mock_celery_control, async_client):
    setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control)
    
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert data["dependencies"]["database"]["status"] == "healthy"
    assert "latency_ms" in data["dependencies"]["database"]
    assert data["dependencies"]["redis"]["status"] == "healthy"
    assert "latency_ms" in data["dependencies"]["redis"]
    assert data["dependencies"]["celery"]["status"] == "healthy"
    assert data["dependencies"]["celery"]["active_workers"] == 1

@pytest.mark.asyncio
@patch("app.api.v1.endpoints.health.celery_app.control")
@patch("app.api.v1.endpoints.health.aioredis.from_url")
@patch("app.api.v1.endpoints.health.AsyncSession.execute")
async def test_health_db_unhealthy(mock_db_execute, mock_redis_from_url, mock_celery_control, async_client):
    setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control)
    
    mock_db_execute.side_effect = OperationalError("statement", "params", "orig")
    
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 503
    
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["dependencies"]["database"]["status"] == "unhealthy"
    assert data["dependencies"]["database"]["error"] != ""
    assert data["dependencies"]["redis"]["status"] == "healthy"
    assert data["dependencies"]["celery"]["status"] == "healthy"

@pytest.mark.asyncio
@patch("app.api.v1.endpoints.health.celery_app.control")
@patch("app.api.v1.endpoints.health.aioredis.from_url")
@patch("app.api.v1.endpoints.health.AsyncSession.execute")
async def test_health_redis_unhealthy(mock_db_execute, mock_redis_from_url, mock_celery_control, async_client):
    setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control)
    
    mock_redis_client = AsyncMock()
    mock_redis_client.ping.side_effect = ConnectionError("Redis connection refused")
    mock_redis_from_url.return_value = mock_redis_client
    
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 503
    
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["dependencies"]["database"]["status"] == "healthy"
    assert data["dependencies"]["redis"]["status"] == "unhealthy"
    assert data["dependencies"]["redis"]["error"] != ""
    assert data["dependencies"]["celery"]["status"] == "healthy"

@pytest.mark.asyncio
@patch("app.api.v1.endpoints.health.celery_app.control")
@patch("app.api.v1.endpoints.health.aioredis.from_url")
@patch("app.api.v1.endpoints.health.AsyncSession.execute")
async def test_health_celery_no_workers(mock_db_execute, mock_redis_from_url, mock_celery_control, async_client):
    setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control)
    
    mock_inspect = MagicMock()
    mock_inspect.active.return_value = None
    mock_celery_control.inspect.return_value = mock_inspect
    
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 503
    
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["dependencies"]["celery"]["status"] == "unhealthy"
    assert data["dependencies"]["celery"]["active_workers"] == 0

@pytest.mark.asyncio
@patch("app.api.v1.endpoints.health.celery_app.control")
@patch("app.api.v1.endpoints.health.aioredis.from_url")
@patch("app.api.v1.endpoints.health.AsyncSession.execute")
async def test_health_response_schema(mock_db_execute, mock_redis_from_url, mock_celery_control, async_client):
    setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control)
    
    response = await async_client.get("/api/v1/health")
    data = response.json()
    
    assert "status" in data
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data
    assert "dependencies" in data
    
    assert data["version"] == "1.0.0"
    # Basic ISO 8601 validation
    assert "T" in data["timestamp"]

@pytest.mark.asyncio
@patch("app.api.v1.endpoints.health.celery_app.control")
@patch("app.api.v1.endpoints.health.aioredis.from_url")
@patch("app.api.v1.endpoints.health.AsyncSession.execute")
async def test_health_not_rate_limited(mock_db_execute, mock_redis_from_url, mock_celery_control, async_client, monkeypatch):
    setup_healthy_mocks(mock_db_execute, mock_redis_from_url, mock_celery_control)
    from app.config import settings
    monkeypatch.setattr(settings, "rate_limit_requests", 1)
    
    for _ in range(5):
        response = await async_client.get("/api/v1/health")
        assert response.status_code == 200
