import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from app.db.session import get_db
from app.config import settings
from app.workers.celery_app import celery_app

router = APIRouter()

@router.get("")
async def get_health(response: Response, db: AsyncSession = Depends(get_db)):
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "database": {"status": "healthy"},
            "redis": {"status": "healthy"},
            "celery": {"status": "healthy"}
        }
    }
    
    is_overall_healthy = True

    # Check Database
    start_time = time.time()
    try:
        await db.execute(text("SELECT 1"))
        latency = (time.time() - start_time) * 1000
        health_status["dependencies"]["database"]["latency_ms"] = round(latency, 2)
    except Exception as e:
        health_status["dependencies"]["database"]["status"] = "unhealthy"
        health_status["dependencies"]["database"]["error"] = str(e)
        is_overall_healthy = False

    # Check Redis
    redis_client = None
    start_time = time.time()
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        latency = (time.time() - start_time) * 1000
        health_status["dependencies"]["redis"]["latency_ms"] = round(latency, 2)
    except Exception as e:
        health_status["dependencies"]["redis"]["status"] = "unhealthy"
        health_status["dependencies"]["redis"]["error"] = str(e)
        is_overall_healthy = False
    finally:
        if redis_client:
            await redis_client.aclose()

    # Check Celery
    try:
        inspect = celery_app.control.inspect(timeout=2.0)
        result = inspect.active()
        active_workers = len(result) if result else 0
        health_status["dependencies"]["celery"]["active_workers"] = active_workers
        
        if result is None:
            health_status["dependencies"]["celery"]["status"] = "unhealthy"
            health_status["dependencies"]["celery"]["error"] = "No workers responding"
            is_overall_healthy = False
            
    except Exception as e:
        health_status["dependencies"]["celery"]["status"] = "unhealthy"
        health_status["dependencies"]["celery"]["error"] = str(e)
        health_status["dependencies"]["celery"]["active_workers"] = 0
        is_overall_healthy = False

    if not is_overall_healthy:
        health_status["status"] = "unhealthy"
        response.status_code = 503
        
    return health_status
