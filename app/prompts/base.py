from dataclasses import dataclass

@dataclass
class PromptTemplate:
    """Template configuration for evaluation prompts."""
    
    # system prompt placeholders: {content_type}
    individual_score_system: str
    
    # user prompt placeholders: {content_type}, {rubric_json}, {submission_content}, {submission_id}
    individual_score_user: str
    
    # system prompt placeholders: {content_type}
    cluster_compare_system: str
    
    # user prompt placeholders: {content_type}, {rubric_json}, {submissions_json}
    cluster_compare_user: str
    
    # system prompt placeholders: {content_type}
    feedback_system: str
    
    # user prompt placeholders: {content_type}, {rubric_json}, {submission_content}, {criterion_scores_json}, {percentile}, {cohort_size}
    feedback_user: str
