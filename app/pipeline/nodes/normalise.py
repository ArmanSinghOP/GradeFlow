from app.pipeline.state import GradeFlowState
from app.core.logging import get_logger

logger = get_logger(__name__)

async def normalise_node(state: GradeFlowState) -> dict:
    scores = state["scores"]
    anchor_scores = state.get("anchor_scores", [])
    rubric = state["rubric"]
    
    if not scores:
        return {"scores": scores, "current_node": "normalise"}
        
    # max_possible_score
    max_possible_score = sum(
        float(criterion.get("max_score", 0.0)) * float(criterion.get("weight", 0.0))
        for criterion in rubric.get("criteria", [])
    )
    if max_possible_score == 0:
        max_possible_score = 100.0 # fallback

    # Anchor adjustments
    shift = 0.0
    if anchor_scores:
        anchor_mean = sum(a["raw_total"] for a in anchor_scores) / len(anchor_scores)
        cohort_mean = sum(s["raw_total"] for s in scores) / len(scores)
        shift = anchor_mean - cohort_mean
        
    for score in scores:
        adjusted_raw_total = score["raw_total"] + shift
        clamped_raw_total = max(0.0, min(adjusted_raw_total, max_possible_score))
        
        normalised_val = (clamped_raw_total / max_possible_score) * 100.0
        score["normalised_score"] = max(0.0, min(normalised_val, 100.0))
        
    # Percentile
    total_submissions = len(scores)
    for score in scores:
        s_val = score["normalised_score"]
        count_below = sum(1 for other in scores if other["normalised_score"] < s_val)
        percentile_val = (count_below / total_submissions) * 100.0
        score["percentile"] = round(percentile_val, 2)
        
    # Rank (dense ranking)
    sorted_scores = sorted(scores, key=lambda x: x["normalised_score"], reverse=True)
    current_rank = 1
    for i, s in enumerate(sorted_scores):
        if i > 0 and s["normalised_score"] < sorted_scores[i-1]["normalised_score"]:
            current_rank += 1
        # Update original score reference
        s["rank"] = current_rank

    # Flag borderline
    flagged_count = 0
    boundaries = [90.0, 80.0, 70.0, 60.0, 50.0]
    for score in scores:
        if not score.get("flagged_for_review"):
            s_val = score["normalised_score"]
            is_borderline = any(abs(s_val - b) <= 2.0 for b in boundaries)
            if is_borderline:
                score["flagged_for_review"] = True
                score["flag_reason"] = "Score within 2 points of grade boundary"
                flagged_count += 1
                
    mean_score = sum(s["normalised_score"] for s in scores) / total_submissions if total_submissions > 0 else 0.0
    max_score = max((s["normalised_score"] for s in scores), default=0.0)
    min_score = min((s["normalised_score"] for s in scores), default=0.0)
    
    logger.info(f"normalise_node complete: mean={mean_score:.2f}, max={max_score:.2f}, min={min_score:.2f}, flagged={flagged_count}")
        
    return {
        "scores": scores,
        "current_node": "normalise"
    }
