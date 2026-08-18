import uuid
import asyncio
import json
from datetime import datetime
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
    async def event_generator():
        try:
            parsed_id = uuid.UUID(job_id)
        except ValueError:
            yield {"data": json.dumps({
                "event": "error", "job_id": job_id, 
                "error_message": "Invalid job_id format", "timestamp": datetime.utcnow().isoformat()
            })}
            return

        try:
            job_result = await db.execute(select(Job).where(Job.id == parsed_id))
            job = job_result.scalars().first()
            
            if not job:
                yield {"data": json.dumps({
                    "event": "error", "job_id": job_id, 
                    "error_message": "Job not found", "timestamp": datetime.utcnow().isoformat()
                })}
                return

            yield {"data": json.dumps({
                "event": "connected", "job_id": job_id, 
                "timestamp": datetime.utcnow().isoformat()
            })}

            last_status = None
            streamed_result_ids = set()
            poll_interval = 2.0

            while True:
                # Polling query logic requires valid session
                job_result = await db.execute(select(Job).where(Job.id == parsed_id))
                job = job_result.scalars().first()
                if not job:
                    break
                    
                if job.status != last_status:
                    progress_percent = 0.0
                    if job.submission_count and job.submission_count > 0:
                        progress_percent = (job.completed_count / job.submission_count) * 100
                    yield {"data": json.dumps({
                        "event": "progress", "job_id": job_id, "status": job.status,
                        "completed_count": job.completed_count, "submission_count": job.submission_count,
                        "progress_percent": progress_percent, "timestamp": datetime.utcnow().isoformat()
                    })}
                    last_status = job.status

                if streamed_result_ids:
                    query = select(Result).where(
                        Result.job_id == parsed_id,
                        Result.id.notin_(streamed_result_ids)
                    ).order_by(Result.evaluated_at.asc())
                else:
                    query = select(Result).where(Result.job_id == parsed_id).order_by(Result.evaluated_at.asc())

                new_results_res = await db.execute(query)
                new_results = new_results_res.scalars().all()

                for r in new_results:
                    res_dict = {
                        "submission_id": r.submission_id,
                        "job_id": str(r.job_id),
                        "final_score": r.final_score,
                        "max_possible_score": r.max_possible_score,
                        "percentile": r.percentile,
                        "rank": r.rank,
                        "total_in_cohort": r.total_in_cohort,
                        "cluster_id": r.cluster_id,
                        "confidence": r.confidence,
                        "flagged_for_review": r.flagged_for_review,
                        "flag_reason": r.flag_reason,
                        "criterion_scores": r.criterion_scores,
                        "narrative_feedback": r.narrative_feedback,
                        "cohort_comparison_summary": r.cohort_comparison_summary,
                        "evaluated_at": r.evaluated_at.isoformat() if r.evaluated_at else None
                    }
                    yield {"data": json.dumps({
                        "event": "result", "job_id": job_id, 
                        "result": res_dict, "timestamp": datetime.utcnow().isoformat()
                    })}
                    streamed_result_ids.add(r.id)

                if job.status == JobStatus.COMPLETED.value:
                    if len(streamed_result_ids) >= job.completed_count:
                        pass
                    yield {"data": json.dumps({
                        "event": "done", "job_id": job_id, 
                        "total_results": len(streamed_result_ids), "timestamp": datetime.utcnow().isoformat()
                    })}
                    return

                if job.status == JobStatus.FAILED.value:
                    yield {"data": json.dumps({
                        "event": "error", "job_id": job_id, 
                        "error_message": job.error_message or "Job failed", "timestamp": datetime.utcnow().isoformat()
                    })}
                    return

                await asyncio.sleep(poll_interval)
                
        except asyncio.CancelledError:
            from app.core.logging import get_logger
            get_logger(__name__).info(f"SSE client disconnected for job {job_id}")
            return
        except Exception as e:
            from app.core.logging import get_logger
            get_logger(__name__).error(f"Error in SSE stream for job {job_id}: {e}")
            yield {"data": json.dumps({
                "event": "error", "job_id": job_id, 
                "error_message": str(e), "timestamp": datetime.utcnow().isoformat()
            })}
            return

    return EventSourceResponse(event_generator(), ping=15, media_type="text/event-stream")
