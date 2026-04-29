# GradeFlow

*A production-grade, context-aware cohort evaluation engine — built with FastAPI, LangGraph, and pgvector.*

![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-FFD43B?style=flat-square&logo=python&logoColor=blue)
![Tests](https://img.shields.io/badge/Tests-114_passing-brightgreen?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## The Problem with Standard LLM Evaluation

When an LLM evaluates 1000 essays one by one, its interpretation of "a 7/10 argument" shifts subtly across the batch. Essay 1 and essay 800 are not being held to the same standard — there is no reference point. This is score drift, and it's invisible.

Absolute scores lose cohort context. A 75/100 essay in a weak cohort might be the strongest submission. The same score in a strong cohort might rank last. Standard evaluation cannot distinguish these cases.

Criteria like "clarity" or "originality" are abstract until anchored to real examples. Without concrete reference submissions, the LLM interprets rubric criteria inconsistently across a large batch.

**GradeFlow solves all three problems.**

---

## What GradeFlow Does

GradeFlow evaluates large batches of submissions — essays, code, reports, interviews — not in isolation but relative to each other. It embeds every submission, clusters them semantically, compares them within clusters using a sliding window LLM approach, and normalises scores against a manually pre-scored anchor set. The result: calibrated, drift-proof scores with per-submission narrative feedback, cohort percentile, and confidence ratings — all delivered in real time via Server-Sent Events.

| Capability | Detail |
|---|---|
| Batch size | Up to 10,000+ submissions |
| Content types | Essay, Code, Report, Interview |
| Evaluation model | GPT-4o (configurable) |
| Clustering | KMeans, k = n/25, auto-sized |
| Comparison | Sliding window (size 10, overlap 3) |
| Calibration | Anchor-based score normalisation |
| Output | Score, percentile, rank, narrative feedback |
| Streaming | Server-Sent Events — results as they complete |
| Observability | LangSmith tracing + structured JSON logs |

---

## How It Works

```text
Submissions
│
▼
┌─────────────────────────────────────────────────┐
│  1. EMBED      OpenAI text-embedding-3-small     │
│                Batched, parallel, 1536 dims      │
│                Stored in pgvector                │
└────────────────────────┬────────────────────────┘
│
▼
┌─────────────────────────────────────────────────┐
│  2. CLUSTER    KMeans — target ~25 per cluster   │
│                Bridge essay detection            │
│                Semantic grouping                 │
└────────────────────────┬────────────────────────┘
│
▼
┌─────────────────────────────────────────────────┐
│  3. SCORE      LangGraph node — individual score │
│                Each submission vs rubric         │
│                Concurrent, Semaphore(10)         │
└────────────────────────┬────────────────────────┘
│
▼
┌─────────────────────────────────────────────────┐
│  4. COMPARE    LangGraph node — cluster compare  │
│                Sliding window within clusters    │
│                Score adjustment + calibration    │
└────────────────────────┬────────────────────────┘
│
▼
┌─────────────────────────────────────────────────┐
│  5. NORMALISE  Anchor-based score shift          │
│                Percentile + dense rank           │
│                Grade boundary flagging           │
└────────────────────────┬────────────────────────┘
│
▼
┌─────────────────────────────────────────────────┐
│  6. FEEDBACK   LangGraph node — narrative        │
│                Personalised per submission       │
│                Cohort comparison summary         │
└────────────────────────┬────────────────────────┘
│
▼
┌─────────────────────────────────────────────────┐
│  7. STREAM     Server-Sent Events                │
│                Results as they complete          │
│                5 event types                     │
└─────────────────────────────────────────────────┘
```

Every batch moves through a tracked status pipeline: `QUEUED → EMBEDDING → CLUSTERING → EVALUATING → NORMALISING → GENERATING_FEEDBACK → COMPLETED`. Status is queryable at any point. The SSE stream emits `progress` events at each transition so clients get live updates without polling.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI + Pydantic v2 + Uvicorn + uvloop |
| Orchestration | LangGraph (StateGraph, 4-node pipeline) |
| LLM chains | LangChain + ChatOpenAI |
| Task queue | Celery + Redis |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Vector store | PostgreSQL + pgvector (ivfflat index) |
| Clustering | scikit-learn KMeans |
| Database | PostgreSQL + SQLAlchemy 2.0 async |
| Migrations | Alembic |
| Streaming | Server-Sent Events (sse-starlette) |
| Observability | LangSmith + structured JSON logging |
| Auth/Security | Rate limiting, security headers, request ID middleware |
| Containers | Docker + docker-compose + nginx |
| Testing | pytest + pytest-asyncio (114 tests) |

---

## API Reference

**Evaluation**
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/evaluate` | Submit a batch for evaluation |
| GET | `/api/v1/jobs/{job_id}` | Get job status and progress |
| GET | `/api/v1/jobs` | List all jobs (paginated) |
| GET | `/api/v1/results/{job_id}` | Get completed results |
| GET | `/api/v1/results/{job_id}/stream` | SSE stream of live results |

**Anchor Management**
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/anchors` | List all anchor sets |
| POST | `/api/v1/anchors` | Create a new anchor set |
| GET | `/api/v1/anchors/{id}` | Get anchor set details |
| PUT | `/api/v1/anchors/{id}` | Update an anchor set |
| DELETE | `/api/v1/anchors/{id}` | Delete an anchor set |
| POST | `/api/v1/anchors/{id}/preview` | Calibration shift preview |
| POST | `/api/v1/anchors/{id}/validate` | Validate anchor set |

**System**
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Simple health check |
| GET | `/api/v1/health` | Detailed dependency health check |

<details>
<summary>curl examples</summary>

**Health check:**
```bash
curl http://localhost:8000/api/v1/health
```

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
    "anchor_set_id": "math_101_fall_2024",
    "content_type": "essay",
    "description": "Fall 2024 Math 101 anchors",
    "version": 1,
    "rubric_name": "General Essay",
    "rubric_criteria": [
      {"name": "Grammar", "description": "Check grammar", "max_score": 10, "weight": 0.5},
      {"name": "Content", "description": "Check content", "max_score": 10, "weight": 0.5}
    ],
    "anchors": [
      {
        "id": "anchor1",
        "content": "A perfect essay.",
        "human_scores": {"Grammar": 10, "Content": 10},
        "final_score": 10.0,
        "difficulty": "proficient",
        "notes": ""
      }
    ]
  }'
```

**Run calibration preview:**
```bash
curl -X POST http://localhost:8000/api/v1/anchors/{id}/preview \
  -H "Content-Type: application/json" \
  -d '{"sample_scores": [20, 30, 40, 50, 60, 70, 80]}'
```

</details>

---

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone replace_with_your_repo_url
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
   curl http://localhost:8000/
   # Expected: {"status":"ok","version":"1.0.0"}
   ```

5. **API Documentation:**
   Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.

> **Note:** The first startup runs `alembic upgrade head` automatically. PostgreSQL and Redis must be healthy before the API starts — docker-compose handles this via `depends_on: condition: service_healthy`.

---

## Configuration

| Variable | Description | Default | Required |
| --- | --- | --- | --- |
| `POSTGRES_USER` | PostgreSQL active user | `gradeflow` | no |
| `POSTGRES_PASSWORD` | PostgreSQL active password | `gradeflow_secret` | no |
| `POSTGRES_DB` | PostgreSQL database name | `gradeflow_db` | no |
| `POSTGRES_HOST` | Database host | `db` | no |
| `POSTGRES_PORT` | Database port | `5432` | no |
| `DATABASE_URL` | SQLAlchemy async connection string | `postgresql+asyncpg://...` | no |
| `REDIS_URL` | Redis URL | `redis://redis:6379/0` | no |
| `CELERY_BROKER_URL` | Message broker URL | `redis://redis:6379/0` | no |
| `CELERY_RESULT_BACKEND` | Celery result tracker | `redis://redis:6379/1` | no |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-your-key-here` | yes |
| `LLM_PROVIDER` | LLM Platform provider | `openai` | no |
| `LLM_MODEL` | LLM text evaluation model | `gpt-4o` | no |
| `EMBEDDING_MODEL` | LLM embedding model | `text-embedding-3-small` | no |
| `EMBEDDING_BATCH_SIZE` | Chunk size for embeddings | `100` | no |
| `MAX_CLUSTER_SIZE` | Maximum cohort clump | `50` | no |
| `MIN_CLUSTER_SIZE` | Valid cohort limit | `10` | no |
| `ANCHOR_SET_PATH` | Path where calibration files are stored | `./anchors` | no |
| `LOG_LEVEL` | Application log output verbosity | `INFO` | no |
| `ENVIRONMENT` | Prod/dev flag | `development` | no |
| `LANGSMITH_API_KEY` | LangSmith optional key | `your-langsmith-key-here` | no |
| `LANGSMITH_PROJECT` | LangSmith project name | `gradeflow` | no |
| `LANGSMITH_TRACING_ENABLED` | Enable LangSmith | `false` | no |
| `RATE_LIMIT_REQUESTS` | Requests per window | `60` | no |
| `RATE_LIMIT_WINDOW` | Window in seconds | `60` | no |
| `ALLOWED_ORIGINS` | CORS origins | `["*"]` | no |

*(Note: The maximum request body size is limited to 50MB using a custom middleware. For batches >5000 submissions, split the batch or increase this limit in `app/main.py`.)*

---

## Architecture

<details>
<summary>6-phase build breakdown</summary>

### Phase 1 — Infrastructure & Async Foundation
Establishes the full async stack — FastAPI with Pydantic v2 schemas, SQLAlchemy 2.0 async models with pgvector Vector(1536) column, Alembic migrations including an ivfflat index for nearest-neighbor search, and a Celery worker with Redis broker. All API contracts are validated at the schema layer before any work is queued.

### Phase 2 — Embedding & Clustering Engine
Installs the core batch processing logic connecting the OpenAI embedding endpoint to the Celery worker `process_batch_task`. Uses scikit-learn to map 1536-dimensional embeddings into logical cohort clusters with KMeans, dynamically assigning context groups based on submission volume and semantic proximity.

### Phase 3 — LangGraph Pipeline Implementation
The system employs LangGraph as a deterministic orchestration mesh for prompt chaining. It routes evaluating nodes — individual score generation, cluster-aware comparison, normalisation, and feedback synthesis — to construct highly reliable and reproducible evaluation structures.

### Phase 4 — Distributed Anchor Mapping
Constructs full CRUD calibration paths to let human evaluators dictate alignment offsets across AI models. Incorporates extensive path validations and calibration testing schemas over a flat-file JSON structure to ensure systemic scoring fairness against predefined ground-truth anchors.

### Phase 5 — Full Observability & API Resilience
Rounds out the product experience by enabling real-time Server-Sent Events (`results/stream`) and high system durability. Introduces sliding window rate limiting via Redis and adds end-to-end integration mapping over LangSmith traces for deep pipeline insight.

### Phase 6 — Production Readiness
Implements final production infrastructure, including a multi-stage Docker build with NGINX reverse-proxy configuration and comprehensive dependency health checks. Bolsters system robustness with security headers, Request ID middleware for enhanced observability, advanced worker dead-letter recovery handling, and `pyproject.toml` standardized tooling integration.

</details>

---

## Testing

```bash
# Unit tests — no Docker required
pytest tests/ -m "not integration"

# Integration tests — requires docker-compose up
pytest tests/ -m integration

# Full suite
pytest tests/

# With coverage report
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

**114 tests** across 10 test files, covering schemas, API endpoints, embedding engine, clustering, LangGraph nodes (individual score, cluster compare, normalisation, feedback), anchor validation, anchor manager, SSE streaming, rate limiting, health checks, and request ID middleware.

---

## Observability

### LangSmith Tracing

1. Generate an API Key in LangSmith.
2. In `.env`, set `LANGSMITH_API_KEY=<your-key>`.
3. Set `LANGSMITH_TRACING_ENABLED=true`.
4. Set `LANGSMITH_PROJECT=gradeflow` (or custom name).
5. Open up LangSmith tracing dashboard to correlate runs.

Once enabled, every evaluation run appears in LangSmith with: full LangGraph node traces, per-node LLM input/output, token usage, latency per stage, job_id and content_type metadata tags.

### Structured Logging

All pipeline events are logged as structured JSON. Every log line includes event name, timestamp, job_id, and relevant context. View logs with:
```bash
docker-compose logs worker --follow
```
Key events: `node_start`, `node_complete`, `job_status_change`, `job_dead_lettered`.

### Health Monitoring

The `/api/v1/health` endpoint checks all three dependencies and returns latency metrics:
```bash
curl http://localhost:8000/api/v1/health
```
Returns 200 when healthy, 503 with details when any dependency is down.

---

## Production Deployment

```bash
# Build production image
docker build -f docker/Dockerfile.prod -t gradeflow:prod .

# Run with environment variables
docker run -p 8000:8000 --env-file .env gradeflow:prod
```

Notes:
  - Production image uses multi-stage build (python:3.11-slim)
  - Runs as non-root user (uid 1000)
  - nginx config provided at docker/nginx.conf
  - uvloop + httptools for maximum throughput
  - Set ALLOWED_ORIGINS to your frontend domain in production

---

## Frontend

A React + Vite dashboard is available in the `gradeflow-frontend/` directory. It provides: real-time job monitoring via SSE, score distribution charts, percentile visualisation, anchor management with calibration preview, and CSV export. See [gradeflow-frontend/FRONTEND_README.md](../gradeflow-frontend/FRONTEND_README.md) for setup instructions.

---
Built with FastAPI · LangGraph · pgvector · Celery
