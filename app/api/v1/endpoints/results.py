import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.job import Job
from app.models.result import Result
from app.schemas.result import JobResultsResponse, SubmissionResult
from app.schemas.job import JobStatus

router = APIRouter()

@router.get("/{job_id}", response_model=JobResultsResponse)
async def get_results(
    job_id: str,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get the evaluated results for a completed job."""
    try:
        parsed_id = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job_result = await db.execute(select(Job).where(Job.id == parsed_id))
    job = job_result.scalars().first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status != JobStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Job is not completed")

    results_res = await db.execute(select(Result).where(Result.job_id == job_id).limit(limit).offset(offset))
    db_results = results_res.scalars().all()

    submission_results = []
    for r in db_results:
        submission_results.append(SubmissionResult(
            submission_id=r.submission_id,
            job_id=str(r.job_id),
            final_score=r.final_score,
            max_possible_score=r.max_possible_score,
            percentile=r.percentile,
            rank=r.rank,
            total_in_cohort=r.total_in_cohort,
            cluster_id=r.cluster_id,
            confidence=r.confidence,
            flagged_for_review=r.flagged_for_review,
            flag_reason=r.flag_reason,
            criterion_scores=r.criterion_scores,
            narrative_feedback=r.narrative_feedback,
            cohort_comparison_summary=r.cohort_comparison_summary,
            evaluated_at=r.evaluated_at
        ))

    return JobResultsResponse(
        job_id=str(job.id),
        status=job.status,
        results=submission_results,
        total_count=job.submission_count,
        completed_count=job.completed_count
    )

@router.get("/{job_id}/stream")
async def stream_results(request: Request, job_id: str, db: AsyncSession = Depends(get_db)):
    """Stream results for a job using Server-Sent Events."""
    try:
        parsed_id = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        yielded_count = 0
        while True:
            if await request.is_disconnected():
                break

            job_result = await db.execute(select(Job).where(Job.id == parsed_id))
            job = job_result.scalars().first()
            if not job:
                yield {"event": "error", "data": "Job not found"}
                break

            if job.status == JobStatus.FAILED.value:
                yield {"event": "error", "data": "Job failed"}
                break

            query = select(Result).where(Result.job_id == job_id).order_by(Result.created_at.asc())
            try:
                # Need to use offset based on yielded_count to find new ones
                results_res = await db.execute(query.offset(yielded_count).limit(50))
                new_results = results_res.scalars().all()
                for r in new_results:
                    result_model = SubmissionResult(
                        submission_id=r.submission_id,
                        job_id=str(r.job_id),
                        final_score=r.final_score,
                        max_possible_score=r.max_possible_score,
                        percentile=r.percentile,
                        rank=r.rank,
                        total_in_cohort=r.total_in_cohort,
                        cluster_id=r.cluster_id,
                        confidence=r.confidence,
                        flagged_for_review=r.flagged_for_review,
                        flag_reason=r.flag_reason,
                        criterion_scores=r.criterion_scores,
                        narrative_feedback=r.narrative_feedback,
                        cohort_comparison_summary=r.cohort_comparison_summary,
                        evaluated_at=r.evaluated_at
                    )
                    yield {"event": "result", "data": result_model.model_dump_json()}
                    yielded_count += 1
            except asyncio.CancelledError:
                break

            if job.status == JobStatus.COMPLETED.value:
                if yielded_count >= job.completed_count:
                    yield {"event": "done", "data": "COMPLETED"}
                    break

            await asyncio.sleep(2.0)
            
    return EventSourceResponse(event_generator())
