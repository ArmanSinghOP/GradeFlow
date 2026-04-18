import pytest
import pytest_asyncio

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: requires Docker and running services"
    )
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.session import get_db
from app.models.base import Base

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID, JSONB
import pgvector.sqlalchemy

@compiles(JSONB, 'sqlite')
def compile_jsonb(type_, compiler, **kw):
    return "JSON"

@compiles(pgvector.sqlalchemy.Vector, 'sqlite')
def compile_vector(type_, compiler, **kw):
    return "JSON"

import os

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///test.db"
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

from unittest.mock import patch

@pytest_asyncio.fixture(autouse=True)
def mock_celery_task(request):
    if "integration" in request.node.keywords:
        yield None
    else:
        with patch("app.api.v1.endpoints.evaluate.process_batch_task.delay") as mock_delay:
            yield mock_delay

@pytest_asyncio.fixture(autouse=True)
async def setup_db(request):
    if "integration" in request.node.keywords:
        yield
        return
        
    if os.path.exists("test.db"):
        try:
            os.remove("test.db")
        except:
            pass
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    if os.path.exists("test.db"):
        try:
            os.remove("test.db")
        except:
            pass

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

@pytest.fixture(autouse=True)
def apply_db_override(request):
    if "integration" not in request.node.keywords:
        app.dependency_overrides[get_db] = override_get_db
    else:
        if get_db in app.dependency_overrides:
            del app.dependency_overrides[get_db]
    yield
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]

@pytest_asyncio.fixture
async def async_client():
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def sample_rubric():
    return {
        "name": "General Essay Rubric",
        "description": "Standard rubric",
        "criteria": [
            {"name": "Grammar", "description": "Good grammar", "weight": 0.3},
            {"name": "Content", "description": "Rich content", "weight": 0.5},
            {"name": "Structure", "description": "Well structured", "weight": 0.2}
        ]
    }

@pytest.fixture
def sample_submission_batch():
    return [
        {"id": f"sub_{i}", "content": f"Sample content {i}", "content_type": "essay"}
        for i in range(1, 6)
    ]
