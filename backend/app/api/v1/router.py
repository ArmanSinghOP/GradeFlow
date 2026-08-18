from fastapi import APIRouter
from app.api.v1.endpoints import evaluate, jobs, results, anchors, health

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(evaluate.router, prefix="/evaluate", tags=["evaluate"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(anchors.router, prefix="/anchors", tags=["Anchor Management"])
