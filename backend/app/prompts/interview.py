from app.prompts.base import PromptTemplate
from app.prompts.essay import _build_individual_score_system, INDIVIDUAL_SCORE_USER, CLUSTER_COMPARE_SYSTEM, CLUSTER_COMPARE_USER, FEEDBACK_SYSTEM, FEEDBACK_USER

INTERVIEW_PROMPTS = PromptTemplate(
    individual_score_system=_build_individual_score_system(
        "Evaluate communication clarity, depth of knowledge, and relevance of examples given."
    ),
    individual_score_user=INDIVIDUAL_SCORE_USER,
    cluster_compare_system=CLUSTER_COMPARE_SYSTEM,
    cluster_compare_user=CLUSTER_COMPARE_USER,
    feedback_system=FEEDBACK_SYSTEM,
    feedback_user=FEEDBACK_USER
)
