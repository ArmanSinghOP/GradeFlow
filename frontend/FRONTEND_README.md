# GradeFlow — Frontend

*Real-time evaluation dashboard for the GradeFlow cohort scoring engine.*

![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat-square&logo=vite&logoColor=white)
![Recharts](https://img.shields.io/badge/recharts-%2322B5BF.svg?style=flat-square&logo=recharts&logoColor=white)

## Why This Exists

The GradeFlow backend is a production-grade LLM evaluation pipeline — but a pipeline without an interface is just logs. This frontend was built to make the system's intelligence visible: watching 1000 submissions flow through embedding → clustering → LLM scoring → normalisation in real time, seeing score distributions take shape as results stream in, and understanding how anchor calibration shifts scores across a cohort. It turns an API into something you can actually demo, explain, and reason about visually.

## How It Was Built

Built using vibe coding — iterative AI-assisted development with Google Antigravity (Gemini 3.1 Pro). Each page was designed, spec'd, and implemented through structured prompting: writing precise requirements, reviewing generated code, catching bugs (like stale SSE closures and SQLAlchemy mock patterns), and verifying against the backend API contracts. The AI wrote the code; the engineering decisions — architecture, data flow, component boundaries, real-time patterns — were mine.

> This is the workflow AI engineers will use. I wanted to get comfortable with it early.

## Pages

| Route | Page | What You Can Do |
|---|---|---|
| `/` | Dashboard | Live-polling overview — job counts, submission totals, real-time activity feed. Auto-refreshes every 5s. |
| `/submit` | Submit Batch | 4-step wizard — upload submissions (JSON or manual), build a rubric with weight validation, select an anchor set, review and fire. |
| `/jobs` | Jobs List | Full job history with status filters (All / Active / Completed / Failed). Pipeline progress per job. |
| `/jobs/:id` | Job Monitor | The centrepiece — SSE stream, animated pipeline stage tracker, live result cards animating in as each submission is scored, full feedback drawer. |
| `/results/:id` | Results Explorer | Score distribution histogram, percentile area chart, sortable/filterable table, per-submission feedback, CSV export. |
| `/anchors` | Anchor Manager | Create anchor sets (JSON upload or Quick Form), preview calibration shift with an interactive slider, validate existing sets. |

## Technical Highlights

**SSE streaming with proper cleanup**
The Job Monitor connects to the backend's `/results/:id/stream` endpoint via the native `EventSource` API. The `useSSE` hook accumulates events into state, closes the connection on the `done` event, and returns a cleanup function in `useEffect` to prevent connection stacking on remount — a subtle bug that's easy to miss.

**Real-time without over-fetching**
React Query handles job status polling with a dynamic `refetchInterval` — polling every 3s while the job is active, stopping automatically when it reaches a terminal state (`completed` or `failed`). No unnecessary requests after the job is done.

**Anchor calibration preview**
The calibration slider generates 7 sample scores centred around the cohort mean, debounced at 300ms, and sends them to the backend's `/preview` endpoint. The response shows the exact score shift the anchor set would apply — before running a real evaluation.

**Score visualisation**
Two Recharts charts built for the Results page: a histogram with colour-coded bins (red → green by score range) and a percentile area chart with a custom gradient fill. Both pull from real API data with no mock.

**Content-type agnostic submission**
The Submit wizard handles essays, code, reports, and interviews through the same form — content type propagates to every submission item in the payload, matching the backend's schema exactly.

## Tech Stack

| Category   | Technology                   |
| ---------- | ---------------------------- |
| Framework  | React 19 + TypeScript        |
| Bundler    | Vite 8                       |
| Styling    | Tailwind CSS 3               |
| Charts     | Recharts 3                   |
| State      | Zustand 5 + React Query 5    |
| HTTP       | Axios                        |
| Routing    | React Router 6               |

## Quick Start

```bash
cd gradeflow-frontend
cp .env.example .env
npm install
npm run dev
# Open http://localhost:5173
```

> The backend must be running first.
> See [../gradeflow/README.md](../gradeflow/README.md).

## Project Structure

```
src/
├── api/            # Axios client, endpoint functions (jobs, results, anchors)
├── components/
│   ├── anchors/    # AnchorSetCard, CreateAnchorModal, CalibrationPreview, Validation
│   ├── dashboard/  # StatsRow, JobsTable, ActivityFeed
│   ├── layout/     # AppLayout, Sidebar, TopBar
│   ├── monitor/    # JobSummaryBar, PipelineStageTracker, StreamEventLog, LiveResultCard
│   ├── results/    # ResultsHeader, ScoreDistributionChart, PercentileChart, ResultsTable
│   ├── shared/     # FeedbackDrawer (shared between JobMonitor & Results)
│   └── ui/         # StatusBadge, PipelineProgress, StatCard, Toast, ErrorBoundary, etc.
├── hooks/          # useSSE, useJobStatus, useToast
├── pages/          # Dashboard, Submit, Jobs, JobMonitor, Results, Anchors, NotFound
├── store/          # Zustand global store (useAppStore)
├── types/          # TypeScript interfaces for API schemas
└── utils/          # cn (classnames), time formatters, CSV export
```

## Environment Variables

| Variable          | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `VITE_API_URL`    | Backend URL (leave empty to use the Vite dev proxy)  |
| `VITE_GITHUB_URL` | Your GitHub profile URL (shown in the footer/TopBar) |

Leave `VITE_API_URL` empty in development — the Vite proxy forwards `/api/*` requests to `localhost:8000`, eliminating CORS entirely.

## Backend

This frontend is the interface for the GradeFlow backend — a FastAPI + LangGraph + pgvector evaluation engine. The backend handles all LLM calls, clustering, and scoring. This dashboard makes it observable.

→ [GradeFlow Backend README](../gradeflow/README.md)

---
Built with React · Tailwind · Recharts · Vite
Vibe coded with Google Antigravity + Gemini 3.1 Pro
