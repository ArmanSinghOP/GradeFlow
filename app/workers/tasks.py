import asyncio
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, update
from collections import Counter
from celery.exceptions import Retry
import celery
import openai
from sqlalchemy.exc import OperationalError
from redis.exceptions import ConnectionError as RedisConnectionError
from app.workers.celery_app import celery_app
from app.core.logging import get_logger, log_event
from app.db.session import get_sync_db, async_sessionmaker_db
from app.models.job import Job
from app.models.submission import Submission
from app.schemas.job import JobStatus
from app.embeddings.engine import embed_submissions
from app.clustering.cluster import compute_clusters, detect_bridge_essays, ClusterResult
from app.pipeline.graph import run_evaluation_graph, load_anchor_scores, persist_results

logger = get_logger(__name__)

TRANSIENT_ERRORS = (
    ConnectionError,
    TimeoutError,
    RedisConnectionError,
    OperationalError
)

PERMANENT_ERRORS = (
    openai.AuthenticationError,
    openai.PermissionDeniedError,
    ValueError
)

@celery_app.task(name="handle_failed_job")
def handle_failed_job(job_id: str):
    with get_sync_db() as db:
        job = db.execute(select(Job).filter(Job.id == job_id)).scalar_one_or_none()
        if job and job.status != JobStatus.FAILED.value:
            job.status = JobStatus.FAILED.value
            job.error_message = "Task failed after maximum retries. Manual intervention required."
            db.commit()
            log_event(logger, "error", "job_dead_lettered", job_id=job_id)

class ProcessBatchTask(celery.Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        job_id = args[0] if args else kwargs.get("job_id")
        if job_id:
            handle_failed_job.delay(job_id)

def get_or_create_loop():
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop

@celery_app.task(bind=True, base=ProcessBatchTask, name="process_batch")
def process_batch_task(self, job_id: str) -> dict:
    logger.info(f"Starting process_batch_task for job {job_id}")
    
    worker_loop = get_or_create_loop()
    
    try:
        with get_sync_db() as db:
            job = db.execute(select(Job).filter(Job.id == job_id)).scalar_one_or_none()
            if not job:
                logger.error(f"Job {job_id} not found")
                return {"status": "error", "message": "job not found"}
            
            submissions = db.execute(select(Submission).filter(Submission.job_id == job_id)).scalars().all()
            if not submissions:
                job.status = JobStatus.FAILED.value
                job.error_message = "No submissions found"
                db.commit()
                return {"status": "failed", "job_id": job_id}
            
            job.status = JobStatus.EMBEDDING.value
            db.commit()
            log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.EMBEDDING.value, submission_count=len(submissions))
            
            logger.info(f"Running embeddings for {len(submissions)} submissions")
            
            async def run_embedding():
                async with async_sessionmaker_db() as async_db:
                    await embed_submissions(submissions, async_db)
            
            worker_loop.run_until_complete(run_embedding())
            logger.info(f"Embedding complete for job {job_id}")
            
            job.status = JobStatus.CLUSTERING.value
            db.commit()
            log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.CLUSTERING.value, submission_count=len(submissions))
            
            # Step F - Cluster
            submissions_with_embeds = db.execute(
                select(Submission).filter(Submission.job_id == job_id, Submission.embedding.is_not(None))
            ).scalars().all()
            
            embeddings = [s.embedding for s in submissions_with_embeds]
            if embeddings:
                cluster_labels = compute_clusters(embeddings)
                bridge_flags = detect_bridge_essays(embeddings, cluster_labels)
                
                k = len(set(cluster_labels))
                cluster_sizes = dict(Counter(cluster_labels))
                logger.info(f"Cluster sizes: {cluster_sizes}")
                
                # Step G - Persist cluster assignments
                update_params = []
                for sub, label, flag in zip(submissions_with_embeds, cluster_labels, bridge_flags):
                    update_params.append({
                        "id": sub.id,
                        "cluster_id": int(label),
                        "is_bridge": bool(flag)
                    })
                
                db.execute(update(Submission), update_params)
                job.cluster_count = k
            else:
                k = 0
            
            # Step H - Update status
            job.status = JobStatus.CLUSTERING.value
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
            log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.CLUSTERING.value, submission_count=len(submissions))
            
            # Step I - Update status to EVALUATING
            job.status = JobStatus.EVALUATING.value
            db.commit()
            log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.EVALUATING.value, submission_count=len(submissions))

            # Step J - Prepare graph inputs
            submissions = db.execute(select(Submission).filter(Submission.job_id == job_id)).scalars().all()
            submissions_list = [
                {
                    "id": s.id, 
                    "content": s.content, 
                    "cluster_id": s.cluster_id,
                    "is_bridge": s.is_bridge, 
                    "is_anchor": s.is_anchor
                }
                for s in submissions
            ]
            
            # Step K through N - Eval pipeline
            async def run_eval_pipeline():
                anchor_scores = await load_anchor_scores(
                    anchor_set_id=job.anchor_set_id,
                    content_type=job.content_type,
                    rubric=job.rubric
                )

                final_st = await run_evaluation_graph(
                    job_id=str(job.id),
                    content_type=job.content_type,
                    rubric=job.rubric,
                    anchor_set_id=job.anchor_set_id,
                    submissions=submissions_list,
                    anchor_scores=anchor_scores
                )

                # Step M - Update status DB
                job.status = JobStatus.NORMALISING.value
                db.commit()
                log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.NORMALISING.value, submission_count=len(submissions_list))
                job.status = JobStatus.GENERATING_FEEDBACK.value
                db.commit()
                log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.GENERATING_FEEDBACK.value, submission_count=len(submissions_list))

                # Step N - Persist results
                async with async_sessionmaker_db() as async_db:
                    await persist_results(final_state=final_st, db=async_db)
                    
                return final_st

            try:
                final_state = worker_loop.run_until_complete(run_eval_pipeline())
            except Exception as e:
                job.status = JobStatus.FAILED.value
                job.error_message = str(e)
                db.commit()
                raise e
            
            job.completed_count = len(final_state["scores"])

            # Step O - Mark COMPLETED
            job.status = JobStatus.COMPLETED.value
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
            log_event(logger, "info", "job_status_change", job_id=job_id, new_status=JobStatus.COMPLETED.value, submission_count=len(submissions))

            logger.info(f"Job {job_id} completed. {len(final_state['scores'])} results written.")
            
            return {
                "status": "completed",
                "job_id": job_id,
                "result_count": len(final_state["scores"])
            }
            
    except TRANSIENT_ERRORS as e:
        log_event(logger, "warning", "transient_error", job_id=job_id, error=str(e), retry=self.request.retries)
        raise self.retry(exc=e, countdown=60, max_retries=2)
    except Exception as e:
        log_event(logger, "error", "permanent_error", job_id=job_id, error=str(e))
        try:
            with get_sync_db() as db:
                 job = db.execute(select(Job).filter(Job.id == job_id)).scalar_one_or_none()
                 if job:
                     job.status = JobStatus.FAILED.value
                     job.error_message = str(e)
                     db.commit()
        except Exception:
            pass
        raise e
