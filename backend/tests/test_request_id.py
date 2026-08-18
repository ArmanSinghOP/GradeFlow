import pytest
import uuid
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_request_id_generated_if_absent(async_client):
    response = await async_client.get("/")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    
    req_id = response.headers["X-Request-ID"]
    # Check if it's a valid UUID
    try:
        uuid_obj = uuid.UUID(req_id, version=4)
        assert str(uuid_obj) == req_id
    except ValueError:
        pytest.fail("X-Request-ID is not a valid UUID4")

@pytest.mark.asyncio
async def test_request_id_preserved_if_present(async_client):
    custom_id = "my-custom-id-123"
    response = await async_client.get("/", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == custom_id

@pytest.mark.asyncio
async def test_request_id_in_error_response():
    # Mock an endpoint to raise an Exception
    @app.get("/test-500")
    async def force_error():
        raise ValueError("Intentional error")
        
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as local_client:
        response = await local_client.get("/test-500")
    assert response.status_code == 500
    
    req_id = response.headers.get("X-Request-ID")
    assert req_id is not None
    
    data = response.json()
    assert "request_id" in data
    assert data["request_id"] == req_id

@pytest.mark.asyncio
async def test_request_id_unique_per_request(async_client):
    ids = set()
    for _ in range(3):
        response = await async_client.get("/")
        ids.add(response.headers.get("X-Request-ID"))
    
    assert len(ids) == 3

@pytest.mark.asyncio
async def test_security_headers_present(async_client):
    response = await async_client.get("/")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"

@pytest.mark.asyncio
async def test_security_headers_on_api_endpoint(async_client):
    # Using an endpoint that might return 200 or 422 depending on auth/setup,
    # but the middleware runs before routing completes so headers should be there.
    response = await async_client.get("/api/v1/jobs")
    # Note: jobs endpoint normally returns 200 if list is empty
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
