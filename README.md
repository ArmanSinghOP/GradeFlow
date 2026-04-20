# GradeFlow

Context-aware cohort evaluation engine.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd gradeflow
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Open .env and fill in OPENAI_API_KEY
   ```

3. **Start the services:**
   ```bash
   docker-compose up --build
   ```

4. **Health Check:**
   ```bash
   curl http://localhost:8000/api/v1/
   ```

5. **API Documentation:**
   Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `POSTGRES_USER` | PostgreSQL active user | `gradeflow` |
| `POSTGRES_PASSWORD` | PostgreSQL active password | `gradeflow_secret` |
| `POSTGRES_DB` | PostgreSQL database name | `gradeflow_db` |
| `POSTGRES_HOST` | Database host | `db` |
| `POSTGRES_PORT` | Database port | `5432` |
| `DATABASE_URL` | SQLAlchemy async connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis URL | `redis://redis:6379/0` |
| `CELERY_BROKER_URL` | Message broker URL | `redis://redis:6379/0` |
| `CELERY_RESULT_BACKEND` | Celery result tracker | `redis://redis:6379/1` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-your-key-here` |
| `LLM_PROVIDER` | LLM Platform provider | `openai` |
| `LLM_MODEL` | LLM text evaluation model | `gpt-4o` |
| `EMBEDDING_MODEL` | LLM embedding model | `text-embedding-3-small` |
| `EMBEDDING_BATCH_SIZE` | Chunk size for embeddings | `100` |
| `MAX_CLUSTER_SIZE` | Maximum cohort clump | `50` |
| `MIN_CLUSTER_SIZE` | Valid cohort limit | `10` |
| `ANCHOR_SET_PATH` | Path where calibration files are stored | `./anchors` |
| `LOG_LEVEL` | Application log output verbosity | `INFO` |
| `ENVIRONMENT` | Prod/dev flag | `development` |
| `LANGSMITH_API_KEY` | LangSmith optional key | `your-langsmith-key-here` |
| `LANGSMITH_PROJECT` | LangSmith project name | `gradeflow` |
| `LANGSMITH_TRACING_ENABLED` | Tracing enabler flag | `true` |

*(Note: The maximum request body size is limited to 50MB using a custom middleware. For batches >5000 submissions, split the batch or increase this limit in `app/main.py`.)*

## API Usage Examples

**Submit a batch:**
```bash
curl -X POST http://localhost:8000/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "essay",
    "rubric": {
      "name": "General Essay",
      "criteria": [
        {"name": "Grammar", "description": "Check grammar", "max_score": 10, "weight": 0.5},
        {"name": "Content", "description": "Check content", "max_score": 10, "weight": 0.5}
      ]
    },
    "submissions": [
      {"id": "sub1", "content": "This is the first submission."},
      {"id": "sub2", "content": "This is the second submission."}
    ]
  }'
```

**Poll job status:**
```bash
curl http://localhost:8000/api/v1/jobs/{job_id}
```

**Stream results:**
```bash
curl --no-buffer http://localhost:8000/api/v1/results/{job_id}/stream
```

**Create anchor set:**
```bash
curl -X POST http://localhost:8000/api/v1/anchors \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "essay",
    "rubric": {
      "name": "General Essay",
      "criteria": [
        {"name": "Grammar", "description": "Check grammar", "max_score": 10, "weight": 0.5},
        {"name": "Content", "description": "Check content", "max_score": 10, "weight": 0.5}
      ]
    },
    "anchors": [
      {
        "id": "anchor1",
        "content": "A perfect essay.",
        "human_scores": {"Grammar": 10, "Content": 10},
        "final_score": 100
      }
    ]
  }'
```

**Run calibration preview:**
```bash
curl -X POST http://localhost:8000/api/v1/anchors/123e4567-e89b-12d3.../preview \
  -H "Content-Type: application/json" \
  -d '{
    "submission": {"id": "sub_preview", "content": "I am testing the rubric"}
  }'
```

## Architecture Overview

**Phase 1 — Infrastructure & Async Foundation:** Setup FastAPI framework layout, Postgres+pgvector integration via SQLAlchemy async configurations, and Celery asynchronous boundaries. It creates the data transfer objects through Pydantic.

**Phase 2 — Embedding & Clustering Engine:** Installs the core batch processing logic connecting OpenAI endpoint to the celery worker `process_batch_task`. Uses SciKit to map embeddings into logical cohort clusters for dynamic context assignment.

**Phase 3 — LangGraph Pipeline implementation:** The system employs LangGraph as a deterministic orchestration mesh for prompt chaining. It routes evaluating nodes (`individual_score`, `cluster_compare`, `normalise` and `feedback`) to construct rich evaluation structures.

**Phase 4 — Distributed Anchor Mapping:** Constructs full CRUD calibration paths to let human evaluators dictate alignment offsets across AI models. Incorporates path validations and calibration testing schemas over a flat-file JSON structure.

**Phase 5 — Full Observability & API Resilience:** Rounds out the product experience by enabling real-time Server-Sent Events (`results/stream`) and system durability. Introduces sliding window rate limiting and adds end-to-end integration mapping over LangSmith traces.

**Phase 6 — Production Readiness (Current Phase):** Implements final production infrastructure, including a Docker production build with NGINX reverse-proxy configuration and comprehensive dependency health checks. Bolsters system robustness with security headers, Request ID middleware for enhanced observability, advanced worker dead-letter recovery handling, and `pyproject.toml` standardized tooling integration.

## Running Tests

To run the unit tests (requires NO Docker):
```bash
pytest tests/
```

To run only the non-integration subset (safe for CI):
```bash
pytest tests/ -m "not integration"
```

To run the full suite including live db checks (requires Docker services):
```bash
pytest tests/ -m integration
```

## LangSmith Setup

To enable LangSmith structured tracing, ensure you define the subsequent environment variables:
1. Generate an API Key in LangSmith.
2. In `.env`, set `LANGSMITH_API_KEY=<your-key>`.
3. Set `LANGSMITH_TRACING_ENABLED=true`.
4. Set `LANGSMITH_PROJECT=gradeflow` (or custom name).
5. Open up LangSmith tracing dashboard to correlate runs.

Review documentation directly via [LangSmith User Guide](https://docs.smith.langchain.com/).
