from contextlib import asynccontextmanager
import subprocess
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.api.v1.router import api_router
from app.core.logging import get_logger
from app.core.tracing import setup_tracing
from app.middleware.rate_limit import RateLimitMiddleware

logger = get_logger(__name__)

class LimitUploadSize(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("content-length"):
            if int(request.headers["content-length"]) > 52428800:
                return JSONResponse(status_code=413, content={"detail": "Payload too large"})
        return await call_next(request)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_tracing()
    logger.info("Initializing app lifespan, running migrations.")
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True)
    except subprocess.CalledProcessError as e:
        logger.error(f"Migration failed: {e}")
    yield
    logger.info("Closing app lifespan.")

app = FastAPI(
    title="GradeFlow API",
    description="Context-aware cohort evaluation engine",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(LimitUploadSize)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}
