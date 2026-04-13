from contextlib import asynccontextmanager
import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.logging import get_logger

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
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
