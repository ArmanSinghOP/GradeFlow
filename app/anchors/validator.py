import re
import math
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    anchor_count: int = 0
    difficulty_distribution: Dict[str, int] = field(default_factory=lambda: {
        "weak": 0, "developing": 0, "proficient": 0, "strong": 0, "exemplary": 0
    })

def validate_anchor_set(data: dict, filename_stem: str) -> ValidationResult:
    result = ValidationResult(is_valid=True)
    
    anchor_set_id = data.get("anchor_set_id")
    content_type = data.get("content_type")
    anchors = data.get("anchors", [])
    rubric_criteria = data.get("rubric_criteria", [])
    version = data.get("version")
    
    # Rule 1
    if anchor_set_id != filename_stem:
        result.is_valid = False
        result.errors.append(f"anchor_set_id '{anchor_set_id}' does not match filename stem '{filename_stem}'")
    
    if not isinstance(anchor_set_id, str) or not re.match(r'^[a-zA-Z0-9_-]+$', anchor_set_id):
        result.is_valid = False
        result.errors.append("anchor_set_id must contain only alphanumeric characters, hyphens, and underscores")
        
    # Rule 2
    if content_type not in {"essay", "code", "report", "interview"}:
        result.is_valid = False
        result.errors.append(f"Invalid content_type: {content_type}")
        
    # Rule 3
    result.anchor_count = len(anchors)
    if result.anchor_count < 5:
        result.is_valid = False
        result.errors.append("Anchor set must contain at least 5 anchors")
    elif result.anchor_count < 10:
        result.warnings.append("Anchor set has fewer than 10 anchors — calibration may be less accurate")
        
    # Rule 4
    if result.anchor_count > 50:
        result.is_valid = False
        result.errors.append("Anchor set cannot contain more than 50 anchors")
        
    # Rule 5
    anchor_ids = [a.get("id") for a in anchors]
    if len(set(anchor_ids)) != len(anchor_ids):
        result.is_valid = False
        result.errors.append("All anchor IDs must be unique within the set")
        
    # Rule 6
    weights_sum = sum(c.get("weight", 0) for c in rubric_criteria)
    if not math.isclose(weights_sum, 1.0, abs_tol=0.001):
        result.is_valid = False
        result.errors.append(f"Rubric weights must sum to 1.0 (current sum: {weights_sum})")
        
    # Rule 12
    if not isinstance(version, int) or version < 1:
        result.is_valid = False
        result.errors.append("version must be a positive integer")

    criterion_names = [c.get("name") for c in rubric_criteria]
    max_scores = {c.get("name"): c.get("max_score", 0) for c in rubric_criteria}
    weights = {c.get("name"): c.get("weight", 0) for c in rubric_criteria}
    
    allowed_difficulties = {"weak", "developing", "proficient", "strong", "exemplary"}
    
    difficulties = []
    
    for anchor in anchors:
        human_scores = anchor.get("human_scores", {})
        
        # Rule 7
        for c_name in criterion_names:
            if c_name not in human_scores:
                result.is_valid = False
                result.errors.append(f"Anchor '{anchor.get('id')}' is missing score for criterion '{c_name}'")
                
        # Rule 8
        for c_name, score in human_scores.items():
            max_score = max_scores.get(c_name, 0)
            if not isinstance(score, (int, float)) or not (0 <= score <= max_score):
                result.is_valid = False
                result.errors.append(f"Anchor '{anchor.get('id')}' score for '{c_name}' ({score}) is out of bounds (0-{max_score})")
                
        # Rule 9
        expected_final = sum(human_scores.get(c, 0) * weights.get(c, 0) for c in criterion_names)
        final_score = anchor.get("final_score", 0.0)
        if not math.isclose(final_score, expected_final, abs_tol=0.01):
            result.is_valid = False
            result.errors.append(f"Anchor '{anchor.get('id')}' final_score mismatch. Expected: {expected_final}, Got: {final_score}")
            
        # Rule 10
        difficulty = anchor.get("difficulty")
        if difficulty not in allowed_difficulties:
            result.is_valid = False
            result.errors.append(f"Anchor '{anchor.get('id')}' has invalid difficulty '{difficulty}'")
        else:
            difficulties.append(difficulty)
            if difficulty in result.difficulty_distribution:
                result.difficulty_distribution[difficulty] += 1
                
    # Rule 11
    if len(set(difficulties)) < 3:
        result.is_valid = False
        result.errors.append("The anchor set must cover at least 3 distinct difficulty levels")

    return result

def compute_calibration_preview(anchor_data: dict, sample_scores: list[float]) -> dict:
    if not sample_scores:
        raise ValueError("sample_scores must not be empty")

    anchors = anchor_data.get("anchors", [])
    rubric_criteria = anchor_data.get("rubric_criteria", [])
    
    anchor_mean = sum(a.get("final_score", 0) for a in anchors) / len(anchors) if anchors else 0.0
    cohort_mean = sum(sample_scores) / len(sample_scores)
    shift = anchor_mean - cohort_mean
    
    max_possible = sum(c.get("max_score", 0) * c.get("weight", 0) for c in rubric_criteria)
    
    sample_after = [max(0.0, min(s + shift, max_possible)) for s in sample_scores]
    
    if abs(shift) < 0.5:
        interpretation = "Anchor set will not shift scores significantly"
    elif shift > 0:
        interpretation = f"Anchor set will shift scores UP by {shift:.2f} points"
    else:
        interpretation = f"Anchor set will shift scores DOWN by {abs(shift):.2f} points"
        
    return {
        "anchor_mean": anchor_mean,
        "cohort_mean": cohort_mean,
        "shift": shift,
        "max_possible_score": max_possible,
        "sample_before": sample_scores,
        "sample_after": sample_after,
        "interpretation": interpretation
    }
