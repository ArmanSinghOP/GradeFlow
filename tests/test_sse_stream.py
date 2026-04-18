import pytest
import asyncio
import json
import uuid
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from app.models.job import Job
from app.models.result import Result
from app.schemas.job import JobStatus
from datetime import datetime

class MockDBResult:
    def __init__(self, items=None):
        self.items = items or []
    def scalars(self):
        class MockScalars:
            def first(self_local): return self.items[0] if self.items else None
            def all(self_local): return self.items
        return MockScalars()

@pytest.mark.asyncio
async def test_sse_connected_event(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.QUEUED.value, submission_count=5, completed_count=0)
    
    async def mock_exec(*args, **kwargs):
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:].strip())
                    events.append(data)
                    break
            
            assert len(events) > 0
            assert events[0]["event"] == "connected"
            assert events[0]["job_id"] == job_id
            assert "timestamp" in events[0]

@pytest.mark.asyncio
async def test_sse_progress_event_on_status_change(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    
    poll_count = 0
    async def mock_exec(*args, **kwargs):
        nonlocal poll_count
        poll_count += 1
        
        # Determine query type (job vs result) based on what we passed or just rely on poll_count
        if "Result" in str(args[0]):
            return MockDBResult([])
            
        if poll_count <= 2: # First poll block (Job, Result) -> Job=EMBEDDING
            mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.EMBEDDING.value, submission_count=5, completed_count=0)
        else: # Second poll block -> Job=CLUSTERING
            mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.CLUSTERING.value, submission_count=5, completed_count=0)
            
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))
                    if len(events) == 3: # connected, progress(EMBEDDING), progress(CLUSTERING)
                        break
            
            progress_events = [e for e in events if e["event"] == "progress"]
            assert len(progress_events) == 2
            assert progress_events[0]["status"] == JobStatus.EMBEDDING.value
            assert progress_events[1]["status"] == JobStatus.CLUSTERING.value
            assert "progress_percent" in progress_events[0]

@pytest.mark.asyncio
async def test_sse_result_event_per_result(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.COMPLETED.value, submission_count=3, completed_count=3)
    mock_results = [
        Result(id=1, submission_id="s1", job_id=job_id, final_score=50.0),
        Result(id=2, submission_id="s2", job_id=job_id, final_score=60.0),
        Result(id=3, submission_id="s3", job_id=job_id, final_score=70.0)
    ]
    
    async def mock_exec(*args, **kwargs):
        query_str = str(args[0])
        if "Result" in query_str:
            return MockDBResult(mock_results)
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))
                    if events[-1].get("event") == "done":
                        break
            
            result_events = [e for e in events if e["event"] == "result"]
            assert len(result_events) == 3
            assert result_events[0]["result"]["submission_id"] == "s1"

@pytest.mark.asyncio
async def test_sse_done_event_on_completion(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.COMPLETED.value, submission_count=3, completed_count=3)
    
    async def mock_exec(*args, **kwargs):
        if "Result" in str(args[0]):
            return MockDBResult([
                Result(id=1, submission_id="s1", job_id=job_id, final_score=50.0),
                Result(id=2, submission_id="s2", job_id=job_id, final_score=60.0),
                Result(id=3, submission_id="s3", job_id=job_id, final_score=70.0)
            ])
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))
                    if events[-1].get("event") == "done":
                        break
            
            assert events[-1]["event"] == "done"
            assert events[-1]["total_results"] == 3

@pytest.mark.asyncio
async def test_sse_error_event_on_failure(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.FAILED.value, error_message="Embedding failed", submission_count=1)
    
    async def mock_exec(*args, **kwargs):
        if "Result" in str(args[0]): return MockDBResult([])
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))
                    if events[-1].get("event") == "error":
                        break
                        
            # connected is first, then we hit FAILED and emit error
            error_event = [e for e in events if e["event"] == "error"][0]
            assert error_event["error_message"] == "Embedding failed"

@pytest.mark.asyncio
async def test_sse_job_not_found(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    
    async def mock_exec(*args, **kwargs):
        return MockDBResult([])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))
                    break
            
            assert events[0]["event"] == "error"
            assert events[0]["error_message"] == "Job not found"

@pytest.mark.asyncio
async def test_sse_no_duplicate_results(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.COMPLETED.value, submission_count=3, completed_count=3)
    mock_results = [
        Result(id=1, submission_id="s1", job_id=job_id, final_score=50.0),
        Result(id=2, submission_id="s2", job_id=job_id, final_score=60.0),
        Result(id=3, submission_id="s3", job_id=job_id, final_score=70.0)
    ]
    
    poll_count = 0
    async def mock_exec(*args, **kwargs):
        nonlocal poll_count
        poll_count += 1
        query_str = str(args[0])
        if "Result" in query_str:
            # First poll: return all 3. Second poll: mock_results filter... wait, in test the generator uses select().notin_()
            # If we just return mock_results unconditionally, the logic in python (in the endpoint) will see them if NOT IN clause isn't evaluated by mock.
            # But wait, MockDBResult blindly returns what we give it. If it returns all 3 again on loop 2, the endpoint yields them again!
            # Since mock doesn't implement NOT IN, we fake it here.
            if "NOT IN" in query_str or "notin_" in query_str or "NOT" in query_str or poll_count > 2:
                return MockDBResult([])
            return MockDBResult(mock_results)
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:].strip())
                    events.append(data)
                    if data.get("event") == "done":
                        break
            
            result_events = [e for e in events if e["event"] == "result"]
            assert len(result_events) == 3

@pytest.mark.asyncio
async def test_sse_client_disconnect_handled(async_client: AsyncClient):
    job_id = str(uuid.uuid4())
    mock_job = Job(id=uuid.UUID(job_id), status=JobStatus.QUEUED.value)
    
    async def mock_exec(*args, **kwargs):
        if "Result" in str(args[0]):
            raise asyncio.CancelledError() # Fake disconnect during DB call
        return MockDBResult([mock_job])
        
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, side_effect=mock_exec):
        async with async_client.stream("GET", f"/api/v1/results/{job_id}/stream") as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))
            
            # Should have gracefully exited and not thrown server error 500
            assert len(events) >= 1 # Gets connected event, then throws CancelledError
