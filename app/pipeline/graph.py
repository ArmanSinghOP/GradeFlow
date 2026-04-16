import json
import asyncio
import uuid
from datetime import datetime, timezone
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END

from app.config import settings
from app.core.logging import get_logger
from app.pipeline.state import GradeFlowState, SubmissionScoreDict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.result import Result

logger = get_logger(__name__)

llm = ChatOpenAI(
    model=settings.LLM_MODEL,
    temperature=0.1,
    max_tokens=1000
)

def parse_llm_json(response: str) -> dict:
    try:
        s = response.strip()
        if s.startswith("```json"):
            s = s[7:]
        elif s.startswith("```"):
            s = s[3:]
        if s.endswith("```"):
            s = s[:-3]
        s = s.strip()
        return json.loads(s)
    except json.JSONDecodeError as e:
        logger.error(f"JSON Decode Error interpreting LLM response: {response}")
        raise e
    except Exception as e:
        logger.error(f"Error accessing fields from LLM response: {response}")
        raise e

# Nodes will be imported here
from app.pipeline.nodes.individual_score import individual_score_node
from app.pipeline.nodes.cluster_compare import cluster_compare_node
from app.pipeline.nodes.normalise import normalise_node
from app.pipeline.nodes.feedback import feedback_node

graph = StateGraph(GradeFlowState)
graph.add_node("individual_score", individual_score_node)
graph.add_node("cluster_compare", cluster_compare_node)
graph.add_node("normalise", normalise_node)
graph.add_node("feedback", feedback_node)

graph.set_entry_point("individual_score")
graph.add_edge("individual_score", "cluster_compare")
graph.add_edge("cluster_compare", "normalise")
graph.add_edge("normalise", "feedback")
graph.add_edge("feedback", END)

evaluation_graph = graph.compile()


async def run_evaluation_graph(
    job_id: str,
    content_type: str,
    rubric: dict,
    anchor_set_id: str | None,
    submissions: list[dict],
    anchor_scores: list[SubmissionScoreDict]
) -> GradeFlowState:
    cluster_ids = list(set(s["cluster_id"] for s in submissions))
    initial_state = {
        "job_id": job_id,
        "content_type": content_type,
        "rubric": rubric,
        "anchor_set_id": anchor_set_id,
        "submissions": submissions,
        "scores": [],
        "cluster_ids": cluster_ids,
        "anchor_scores": anchor_scores,
        "cluster_summaries": {},
        "errors": [],
        "current_node": "start"
    }

    try:
        final_state = await evaluation_graph.ainvoke(initial_state)
        return final_state
    except Exception as e:
        logger.exception("Graph invocation raised an exception")
        raise


async def load_anchor_scores(
    anchor_set_id: str | None,
    content_type: str,
    rubric: dict
) -> list[SubmissionScoreDict]:
    from pathlib import Path
    
    if anchor_set_id is None:
        return []

    file_path = Path(settings.ANCHOR_SET_PATH) / f"{anchor_set_id}.json"
    if not file_path.exists():
        logger.warning(f"Anchor set file not found: {file_path}")
        return []

    try:
        import json
        with open(file_path, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
            
        anchor_scores = []
        for anchor in file_data.get("anchors", []):
            individual_scores = []
            max_possible_score = 0.0
            for rubric_criterion in rubric.get("criteria", []):
                crit_name = rubric_criterion["name"]
                if crit_name in anchor.get("human_scores", {}):
                    individual_scores.append({
                        "criterion_name": crit_name,
                        "score": anchor["human_scores"][crit_name],
                        "max_score": rubric_criterion["max_score"],
                        "reasoning": "Human-scored anchor"
                    })
                    max_possible_score += rubric_criterion["max_score"] * rubric_criterion["weight"]

            anchor_scores.append({
                "submission_id": anchor["id"],
                "cluster_id": -1,
                "individual_scores": individual_scores,
                "raw_total": anchor["final_score"],
                "normalised_score": 0.0,
                "percentile": 0.0,
                "rank": 0,
                "confidence": 1.0,
                "flagged_for_review": False,
                "flag_reason": None,
                "narrative_feedback": "",
                "cohort_comparison_summary": ""
            })
            
        return anchor_scores
    except Exception as e:
        logger.error(f"Error loading anchor scores: {e}")
        return []


async def persist_results(
    final_state: GradeFlowState,
    db: AsyncSession
) -> None:
    total_cohort_size = len(final_state["scores"])
    for score in final_state["scores"]:
        result = Result(
            id=uuid.uuid4(),
            submission_id=score["submission_id"],
            job_id=uuid.UUID(final_state["job_id"]),
            final_score=score["normalised_score"],
            max_possible_score=100.0,
            percentile=score["percentile"],
            rank=score["rank"],
            total_in_cohort=total_cohort_size,
            cluster_id=score["cluster_id"],
            confidence=score["confidence"],
            flagged_for_review=score["flagged_for_review"],
            flag_reason=score["flag_reason"],
            criterion_scores=score["individual_scores"],
            narrative_feedback=score["narrative_feedback"],
            cohort_comparison_summary=score["cohort_comparison_summary"],
            evaluated_at=datetime.now(timezone.utc)
        )
        db.add(result)
        
    await db.commit()
    logger.info(f"persist_results: {total_cohort_size} results written for job {final_state['job_id']}")
