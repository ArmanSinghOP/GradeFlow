import asyncio
import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.pipeline.state import GradeFlowState, SubmissionScoreDict
from app.pipeline.graph import llm, parse_llm_json
from app.core.logging import get_logger
from app.prompts import get_prompts

logger = get_logger(__name__)

async def feedback_node(state: GradeFlowState) -> dict:
    prompts = get_prompts(state["content_type"])
    scores = state["scores"]
    rubric = state["rubric"]
    rubric_json = json.dumps(rubric, indent=2)
    
    submissions_dict = {sub["id"]: sub for sub in state["submissions"]}
    cluster_summaries = state.get("cluster_summaries", {})
    cohort_size = len(scores)
    
    semaphore = asyncio.Semaphore(10)
    errors = state.get("errors", []).copy()
    
    async def process_feedback(score: SubmissionScoreDict) -> None:
        sub_id = score["submission_id"]
        sub_content = submissions_dict[sub_id]["content"]
        cluster_id = score["cluster_id"]
        
        # We also need cluster summary if we were passing it explicitly, but prompt wants percentile/cohort size
        # Wait, step 5.4 says: "Get cluster_summary ... use "" if not found ... Build user prompt ... Wait, user prompt placeholders don't have cluster_summary!"
        # But maybe we pass it anyway or the implementation instructions just say: "Get cluster_summary ... Build user prompt using prompt.feedback_user.format(...)"
        # Okay, the prompt didn't ask to insert cluster_summary into the string formatting, but I should probably prepend/append it or maybe it's not actually used in the prompt template?
        # Actually Section 5.4 B says "Get cluster_summary... Build user prompt using prompt.feedback_user.format(content_type=..., rubric_json=..., submission_content=submission content (first 2000 chars), criterion_scores_json=json.dumps(score.individual_scores), percentile=score.percentile, cohort_size=len(state['scores']))" It didn't mention adding cluster_summary to the format. I will just pass it into the context strings possibly, OR just not format it since there's no placeholder.
        # Actually, wait. I will just stick exactly to what's mapped.
        
        async with semaphore:
            # Let's extract first 2000 chars of submission content
            sub_content_preview = sub_content[:2000]
            
            # The prompt string actually doesn't use cluster_summary variable in its placeholder list. Wait!
            
            user_prompt = prompts.feedback_user.format(
                content_type=state["content_type"],
                rubric_json=rubric_json,
                submission_content=sub_content_preview,
                criterion_scores_json=json.dumps(score["individual_scores"]),
                percentile=score["percentile"],
                cohort_size=cohort_size
            )
            
            if cluster_id in cluster_summaries:
                user_prompt += f"\n\nCluster Context:\n{cluster_summaries[cluster_id]}"
                
            try:
                response = await llm.ainvoke([
                    SystemMessage(content=prompts.feedback_system.format(content_type=state["content_type"])),
                    HumanMessage(content=user_prompt)
                ])
                
                parsed_json = parse_llm_json(response.content)
                score["narrative_feedback"] = parsed_json.get("narrative_feedback", "")
                score["cohort_comparison_summary"] = parsed_json.get("cohort_comparison_summary", "")
                
            except Exception as e:
                logger.error(f"feedback failed for {sub_id}: {e}")
                score["narrative_feedback"] = "Feedback generation failed. Please contact your evaluator for manual feedback."
                score["cohort_comparison_summary"] = ""
                errors.append(f"feedback failed for {sub_id}")

    await asyncio.gather(*(process_feedback(s) for s in scores))
    
    logger.info(f"feedback_node complete: {len(scores)} feedback items generated, {len(errors) - len(state.get('errors', []))} errors")
    
    return {
        "scores": scores,
        "errors": errors,
        "current_node": "feedback"
    }
