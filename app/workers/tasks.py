import asyncio
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, update
from collections import Counter
from celery.exceptions import Retry
from app.workers.celery_app import celery_app
from app.core.logging import get_logger
from app.db.session import get_sync_db, async_sessionmaker_db
from app.models.job import Job
from app.models.submission import Submission
from app.schemas.job import JobStatus
from app.embeddings.engine import embed_submissions
from app.clustering.cluster import compute_clusters, detect_bridge_essays, ClusterResult
from app.pipeline.graph import run_evaluation_graph, load_anchor_scores, persist_results

logger = get_logger(__name__)

@celery_app.task(bind=True, name="process_batch")
def process_batch_task(self, job_id: str) -> dict:
    logger.info(f"Starting process_batch_task for job {job_id}")
    
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
            
            logger.info(f"Running embeddings for {len(submissions)} submissions")
            
            async def run_embedding():
                async with async_sessionmaker_db() as async_db:
                    await embed_submissions(submissions, async_db)
            
            asyncio.run(run_embedding())
            logger.info(f"Embedding complete for job {job_id}")
            
            job.status = JobStatus.CLUSTERING.value
            db.commit()
            
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
            
            # Step I - Update status to EVALUATING
            job.status = JobStatus.EVALUATING.value
            db.commit()

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
            
            # Step K - Load anchor scores
            async def run_load_anchor_scores():
                return await load_anchor_scores(
                    anchor_set_id=job.anchor_set_id,
                    content_type=job.content_type,
                    rubric=job.rubric
                )
            
            anchor_scores = asyncio.run(run_load_anchor_scores())

            # Step L - Run LangGraph evaluation graph
            async def run_langgraph():
                return await run_evaluation_graph(
                    job_id=str(job.id),
                    content_type=job.content_type,
                    rubric=job.rubric,
                    anchor_set_id=job.anchor_set_id,
                    submissions=submissions_list,
                    anchor_scores=anchor_scores
                )

            try:
                final_state = asyncio.run(run_langgraph())
            except Exception as e:
                job.status = JobStatus.FAILED.value
                job.error_message = str(e)
                db.commit()
                raise e

            # Step M - Update status DB
            job.status = JobStatus.NORMALISING.value
            db.commit()
            job.status = JobStatus.GENERATING_FEEDBACK.value
            db.commit()

            # Step N - Persist results
            async def run_persist():
                async with async_sessionmaker_db() as async_db:
                    await persist_results(final_state=final_state, db=async_db)

            asyncio.run(run_persist())
            
            job.completed_count = len(final_state["scores"])

            # Step O - Mark COMPLETED
            job.status = JobStatus.COMPLETED.value
            job.updated_at = datetime.now(timezone.utc)
            db.commit()

            logger.info(f"Job {job_id} completed. {len(final_state['scores'])} results written.")
            
            return {
                "status": "completed",
                "job_id": job_id,
                "result_count": len(final_state["scores"])
            }
            
    except (ConnectionError, TimeoutError) as e:
        logger.warning(f"Transient error in process_batch_task: {e}. Retrying.")
        try:
            with get_sync_db() as db:
                 job = db.execute(select(Job).filter(Job.id == job_id)).scalar_one_or_none()
                 if job:
                     job.status = JobStatus.FAILED.value
                     job.error_message = str(e)
                     db.commit()
        except Exception:
            pass
        raise self.retry(exc=e, countdown=60, max_retries=2)
    except Exception as e:
        logger.error(f"Error in process_batch_task: {str(e)}")
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
