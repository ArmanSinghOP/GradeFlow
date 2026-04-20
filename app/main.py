from contextlib import asynccontextmanager
import subprocess
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.v1.router import api_router
from app.core.logging import get_logger, log_event
from app.core.tracing import setup_tracing
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.config import settings

logger = get_logger(__name__)

class LimitUploadSize(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("content-length"):
            if int(request.headers["content-length"]) > 52428800:
                return JSONResponse(status_code=413, content={"detail": "Payload too large"})
        return await call_next(request)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is not set or empty")
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be configured")
        
    log_event(logger, "info", "startup",
              environment=settings.ENVIRONMENT,
              llm_model=settings.LLM_MODEL,
              tracing_enabled=settings.langsmith_tracing_enabled,
              rate_limit=f"{settings.rate_limit_requests} req/{settings.rate_limit_window}s")
              
    setup_tracing()
    logger.info("Initializing app lifespan.")
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
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"Internal server error: {exc}", extra={"request_id": request_id})
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
        headers={"X-Request-ID": request_id}
    )

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}
