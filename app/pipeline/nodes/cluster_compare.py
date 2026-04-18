import asyncio
import json
from langchain_core.messages import SystemMessage, HumanMessage
from collections import defaultdict
from app.pipeline.state import GradeFlowState, SubmissionScoreDict
from app.pipeline.graph import llm, parse_llm_json
from app.core.logging import get_logger, log_event
from app.prompts import get_prompts

logger = get_logger(__name__)

WINDOW_SIZE = 10
WINDOW_OVERLAP = 3

async def cluster_compare_node(state: GradeFlowState) -> dict:
    prompts = get_prompts(state["content_type"])
    scores = state["scores"]
    rubric = state["rubric"]
    cluster_ids = list(set(s["cluster_id"] for s in scores))
    log_event(logger, "info", "node_start", node="cluster_compare", cluster_count=len(cluster_ids), job_id=state.get("job_id"))
    rubric_json = json.dumps(rubric, indent=2)
    
    cluster_summaries = state.get("cluster_summaries", {}).copy()
    errors = state.get("errors", []).copy()
    
    submissions_dict = {sub["id"]: sub for sub in state["submissions"]}
    
    # Group scores by cluster
    clustered_scores = defaultdict(list)
    for score in scores:
        clustered_scores[score["cluster_id"]].append(score)
        
    updated_scores_map = {score["submission_id"]: score.copy() for score in scores}
    # To accumulate overlapping scores: criterion_accumulated[submission_id][criterion_name] = [adjusted_score, ...]
    criterion_accumulated = defaultdict(lambda: defaultdict(list))
    
    rubric_criteria_max = {c["name"]: float(c["max_score"]) for c in rubric.get("criteria", [])}
    rubric_criteria_weights = {c["name"]: float(c["weight"]) for c in rubric.get("criteria", [])}
    
    windows_processed = 0
    errors_this_node = 0

    async def process_window(window_scores: list, cluster_id: int):
        # Build prompt
        submissions_preview = []
        for s in window_scores:
            sub_id = s["submission_id"]
            content = submissions_dict[sub_id]["content"]
            submissions_preview.append({
                "submission_id": sub_id,
                "content_preview": content[:500],
                "criterion_scores": s["individual_scores"]
            })
            
        user_prompt = prompts.cluster_compare_user.format(
            content_type=state["content_type"],
            rubric_json=rubric_json,
            submissions_json=json.dumps(submissions_preview, indent=2)
        )
        
        try:
            response = await llm.ainvoke([
                SystemMessage(content=prompts.cluster_compare_system),
                HumanMessage(content=user_prompt)
            ])
            parsed_json = parse_llm_json(response.content)
            return parsed_json, cluster_id
        except Exception as e:
            logger.error(f"cluster_compare window failed for cluster {cluster_id}: {e}")
            raise e

    # Process each cluster
    for cluster_id, cluster_scores in clustered_scores.items():
        if not cluster_scores:
            continue
            
        windows = []
        if len(cluster_scores) <= WINDOW_SIZE:
            windows.append(cluster_scores)
        else:
            i = 0
            while i < len(cluster_scores):
                windows.append(cluster_scores[i : i + WINDOW_SIZE])
                i += (WINDOW_SIZE - WINDOW_OVERLAP)

        results = await asyncio.gather(*(process_window(w, cluster_id) for w in windows), return_exceptions=True)
        
        last_summary = ""
        for idx, res in enumerate(results):
            windows_processed += 1
            if isinstance(res, Exception):
                errors.append(f"cluster_compare failed for cluster {cluster_id} window {idx}")
                errors_this_node += 1
                continue
            
            parsed_json, _ = res
            if "comparison_summary" in parsed_json:
                last_summary = parsed_json["comparison_summary"]
                
            adjustments = parsed_json.get("adjustments", [])
            for adj in adjustments:
                sub_id = adj.get("submission_id")
                crit_name = adj.get("criterion_name")
                # Clamp score
                raw_adj_score = float(adj.get("adjusted_score", 0.0))
                max_score = rubric_criteria_max.get(crit_name, float('inf'))
                clamped_score = max(0.0, min(raw_adj_score, max_score))
                
                criterion_accumulated[sub_id][crit_name].append(clamped_score)
                
        if last_summary:
            cluster_summaries[cluster_id] = last_summary

    # Apply adjustments averaging
    for sub_id, crits in criterion_accumulated.items():
        if sub_id not in updated_scores_map:
            continue
            
        score_obj = updated_scores_map[sub_id]
        
        for crit_name, values in crits.items():
            if not values:
                continue
            avg_score = sum(values) / len(values)
            
            # Find and update criterion
            for ind_score in score_obj["individual_scores"]:
                if ind_score["criterion_name"] == crit_name:
                    ind_score["score"] = avg_score
                    break
        
        # Recompute raw_total
        new_raw_total = 0.0
        for ind_score in score_obj["individual_scores"]:
            c_name = ind_score["criterion_name"]
            weight = rubric_criteria_weights.get(c_name, 0.0)
            new_raw_total += (ind_score["score"] * weight)
        score_obj["raw_total"] = new_raw_total

    final_scores = [updated_scores_map[sub["submission_id"]] for sub in scores]
    
    logger.info(f"cluster_compare_node complete: {len(clustered_scores)} clusters, {windows_processed} windows, {errors_this_node} errors")
    log_event(logger, "info", "node_complete", node="cluster_compare", clusters=len(clustered_scores), windows=windows_processed, errors=errors_this_node, job_id=state.get("job_id"))
    
    return {
        "scores": final_scores,
        "cluster_summaries": cluster_summaries,
        "errors": errors,
        "current_node": "cluster_compare"
    }
