import asyncio
import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.pipeline.state import GradeFlowState, SubmissionScoreDict, CriterionScoreDict
from app.pipeline.graph import llm, parse_llm_json
from app.core.logging import get_logger
from app.prompts import get_prompts

logger = get_logger(__name__)

async def individual_score_node(state: GradeFlowState) -> dict:
    prompts = get_prompts(state["content_type"])
    submissions = state["submissions"]
    rubric = state["rubric"]
    rubric_json = json.dumps(rubric, indent=2)
    
    semaphore = asyncio.Semaphore(10)
    errors = state.get("errors", []).copy()
    
    async def process_submission(sub: dict) -> SubmissionScoreDict:
        async with semaphore:
            user_prompt = prompts.individual_score_user.format(
                content_type=state["content_type"],
                rubric_json=rubric_json,
                submission_content=sub["content"],
                submission_id=sub["id"]
            )
            try:
                response = await llm.ainvoke([
                    SystemMessage(content=prompts.individual_score_system),
                    HumanMessage(content=user_prompt)
                ])
                
                parsed_json = parse_llm_json(response.content)
                
                individual_scores = []
                # Match parsed scores with rubric weights to compute raw_total
                rubric_criteria = {c["name"]: c for c in rubric.get("criteria", [])}
                raw_total = 0.0
                
                for c_score in parsed_json.get("criterion_scores", []):
                    c_name = c_score.get("criterion_name")
                    score_val = float(c_score.get("score", 0.0))
                    max_score_val = float(c_score.get("max_score", 0.0))
                    
                    crit_score_dict = {
                        "criterion_name": c_name,
                        "score": score_val,
                        "max_score": max_score_val,
                        "reasoning": c_score.get("reasoning", "")
                    }
                    individual_scores.append(crit_score_dict)
                    
                    if c_name in rubric_criteria:
                        weight = float(rubric_criteria[c_name].get("weight", 0.0))
                        raw_total += (score_val * weight)
                        
                return {
                    "submission_id": sub["id"],
                    "cluster_id": sub["cluster_id"],
                    "individual_scores": individual_scores,
                    "raw_total": raw_total,
                    "normalised_score": 0.0,
                    "percentile": 0.0,
                    "rank": 0,
                    "confidence": float(parsed_json.get("confidence", 0.0)),
                    "flagged_for_review": bool(parsed_json.get("flag_for_review", False)),
                    "flag_reason": parsed_json.get("flag_reason"),
                    "narrative_feedback": "",
                    "cohort_comparison_summary": ""
                }
            except Exception as e:
                logger.error(f"individual_score failed for {sub['id']}: {e}")
                errors.append(f"individual_score failed for {sub['id']}")
                return {
                    "submission_id": sub["id"],
                    "cluster_id": sub["cluster_id"],
                    "individual_scores": [],
                    "raw_total": 0.0,
                    "normalised_score": 0.0,
                    "percentile": 0.0,
                    "rank": 0,
                    "confidence": 0.0,
                    "flagged_for_review": True,
                    "flag_reason": "Scoring failed — manual review required",
                    "narrative_feedback": "",
                    "cohort_comparison_summary": ""
                }

    scores = await asyncio.gather(*(process_submission(sub) for sub in submissions))
    
    logger.info(f"individual_score_node complete: {len(scores)} submissions scored, {len(errors) - len(state.get('errors', []))} errors")
    
    return {
        "scores": list(scores),
        "errors": errors,
        "current_node": "individual_score"
    }
