import uuid
import math
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.submission import BatchSubmitRequest, BatchSubmitResponse
from app.models.job import Job
from app.models.submission import Submission
from app.schemas.job import JobStatus
from app.workers.tasks import process_batch_task

router = APIRouter()

@router.post("", response_model=BatchSubmitResponse)
async def submit_batch(
    request: BatchSubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submit a batch of submissions for evaluation."""
    job_id = uuid.uuid4()
    
    new_job = Job(
        id=job_id,
        status=JobStatus.QUEUED.value,
        submission_count=len(request.submissions),
        rubric=request.rubric.model_dump(),
        content_type=request.content_type.value,
        anchor_set_id=request.anchor_set_id,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_job)

    db_submissions = []
    for sub in request.submissions:
        db_submissions.append(
            Submission(
                id=sub.id,
                job_id=job_id,
                content=sub.content,
                content_type=sub.content_type.value,
                metadata_json=sub.metadata,
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
        )
    db.add_all(db_submissions)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    process_batch_task.delay(str(job_id))

    return BatchSubmitResponse(
        job_id=str(job_id),
        status=JobStatus.QUEUED.value,
        submission_count=len(request.submissions),
        estimated_minutes=math.ceil(len(request.submissions) / 100),
        created_at=new_job.created_at
    )
