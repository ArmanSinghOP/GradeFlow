import os
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

def setup_tracing() -> None:
    if not settings.langsmith_tracing_enabled:
        return
    if not settings.langsmith_api_key:
        logger.warning("LangSmith tracing enabled but no API key provided")
        return
        
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    logger.info(f"LangSmith tracing enabled for project: {settings.langsmith_project}")

def get_trace_metadata(job_id: str, content_type: str) -> dict:
    return {
        "job_id": job_id,
        "content_type": content_type,
        "environment": settings.ENVIRONMENT,
        "project": settings.langsmith_project
    }
