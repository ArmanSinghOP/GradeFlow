import asyncio
import httpx
from app.api.v1.endpoints.anchors import get_anchor_set
import os
import json

async def run_e2e():
    os.environ["OPENAI_API_KEY"] = "dummy"
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.db.session import get_db
    from tests.conftest import override_get_db

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        
        # 1. Create anchor
        sample_anchor_payload = {
            "anchor_set_id": "e2e-anchor-set",
            "content_type": "essay",
            "description": "API E2E Set",
            "version": 1,
            "rubric_name": "Test Rubric",
            "rubric_criteria": [
                {"name": "Criteria 1", "weight": 1.0, "max_score": 10.0}
            ],
            "anchors": [
                {"id": f"e2e_{i}", "content": f"content {i}", "human_scores": {"Criteria 1": 10.0}, "final_score": 10.0, "difficulty": "exemplary"}
                for i in range(5)
            ]
        }
        sample_anchor_payload["anchors"].extend([
            {"id": f"e2e_w_{i}", "content": f"weak {i}", "human_scores": {"Criteria 1": 2.0}, "final_score": 2.0, "difficulty": "weak"}
            for i in range(5)
        ])
        sample_anchor_payload["anchors"].extend([
            {"id": f"e2e_m_{i}", "content": f"mid {i}", "human_scores": {"Criteria 1": 5.0}, "final_score": 5.0, "difficulty": "proficient"}
            for i in range(5)
        ])

        sample_anchor_payload["anchor_set_id"] = "e2e-unique-anchor"
        print("Creating anchor...")
        resp = await ac.post("/api/v1/anchors", json=sample_anchor_payload)
        if resp.status_code == 409:
            pass # already exists, fine
        else:
            assert resp.status_code == 201, resp.text
        
        # 2. Evaluate POST using this anchor set ID
        sample_eval_payload = {
            "batch_id": "test_batch_123",
            "submissions": [
                {"id": "sub_1", "content": "hello world", "content_type": "essay"}
            ],
            "rubric": {
                 "name": "General Essay Rubric",
                 "description": "Standard rubric",
                 "criteria": [
                     {"name": "Criteria 1", "description": "some", "weight": 1.0}
                 ]
            },
            "content_type": "essay",
            "anchor_set_id": "e2e-unique-anchor"
        }
        
        print("Submitting evaluate payload...")
        from unittest.mock import patch
        
        # Simulate evaluate worker logic because task.delay won't magically run the worker
        with patch('app.api.v1.endpoints.evaluate.process_batch_task.delay') as mock_delay:
            resp = await ac.post("/api/v1/evaluate", json=sample_eval_payload)
            print("Eval Post Response:", resp.status_code, resp.text)
            assert resp.status_code == 202, resp.text

        print("End-to-end trigger successful!")

if __name__ == "__main__":
    asyncio.run(run_e2e())
