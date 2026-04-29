import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.schemas.job import JobStatusResponse
from app.models.job import Job

router = APIRouter()

@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get the status of a specific job by ID."""
    try:
        parsed_id = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Job not found")
        
    result = await db.execute(select(Job).where(Job.id == parsed_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    progress = 0.0
    if job.submission_count > 0:
        progress = (job.completed_count / job.submission_count) * 100.0
        
    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,
        submission_count=job.submission_count,
        completed_count=job.completed_count,
        cluster_count=job.cluster_count,
        progress_percent=progress,
        created_at=job.created_at,
        updated_at=job.updated_at or job.created_at,
        error_message=job.error_message
    )

@router.get("", response_model=List[JobStatusResponse])
async def list_jobs(
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List all jobs with pagination."""
    result = await db.execute(
        select(Job)
        .order_by(Job.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    jobs = result.scalars().all()
    
    responses = []
    for job in jobs:
        progress = 0.0
        if job.submission_count > 0:
            progress = (job.completed_count / job.submission_count) * 100.0
        responses.append(JobStatusResponse(
            job_id=str(job.id),
            status=job.status,
            submission_count=job.submission_count,
            completed_count=job.completed_count,
            cluster_count=job.cluster_count,
            progress_percent=progress,
            created_at=job.created_at,
            updated_at=job.updated_at or job.created_at,
            error_message=job.error_message
        ))
    return responses
