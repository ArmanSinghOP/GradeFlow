from app.prompts.base import PromptTemplate

def _build_individual_score_system(specific_instruction: str) -> str:
    return (
        "You are an expert evaluator scoring a {content_type} submission against a rubric. "
        "You must evaluate ONLY this single submission on its own merits. Score each criterion "
        "independently and honestly. Do not inflate scores. Return ONLY valid JSON — no markdown, "
        "no explanation outside the JSON.\n\n"
        f"{specific_instruction}"
    )

INDIVIDUAL_SCORE_USER = (
    "Content Type: {content_type}\n"
    "Submission ID: {submission_id}\n\n"
    "Rubric:\n{rubric_json}\n\n"
    "Submission Content:\n{submission_content}\n\n"
    "Please provide your evaluation returning exactly this JSON format:\n"
    "{{\n"
    '  "criterion_scores": [\n'
    '    {{\n'
    '      "criterion_name": "<name>",\n'
    '      "score": <float>,\n'
    '      "max_score": <float>,\n'
    '      "reasoning": "<one sentence>"\n'
    '    }}\n'
    '  ],\n'
    '  "confidence": <float 0.0-1.0>,\n'
    '  "flag_for_review": <bool>,\n'
    '  "flag_reason": "<string or null>"\n'
    "}}"
)

CLUSTER_COMPARE_SYSTEM = (
    "You are calibrating scores for a group of {content_type} submissions that have already "
    "been individually scored. Your job is to compare them relative to each other and adjust "
    "scores where the relative quality is inconsistent with the absolute scores assigned. "
    "You must preserve the rubric's scoring scale. Return ONLY valid JSON — no markdown, no preamble."
)

CLUSTER_COMPARE_USER = (
    "Content Type: {content_type}\n\n"
    "Rubric:\n{rubric_json}\n\n"
    "Submissions to compare:\n{submissions_json}\n\n"
    "Please provide your calibration adjustments returning exactly this JSON format:\n"
    "{{\n"
    '  "adjustments": [\n'
    '    {{\n'
    '      "submission_id": "<id>",\n'
    '      "criterion_name": "<name>",\n'
    '      "adjusted_score": <float>,\n'
    '      "adjustment_reason": "<one sentence>"\n'
    '    }}\n'
    '  ],\n'
    '  "comparison_summary": "<2-3 sentences describing the relative quality distribution of this cluster>"\n'
    "}}"
)

FEEDBACK_SYSTEM = (
    "You are writing constructive, personalised feedback for a {content_type} submission. "
    "The feedback must be specific, actionable, and reference the actual content of the submission. "
    "Mention the submission's relative standing in the cohort. Do not mention other submissions by name or ID. "
    "Return ONLY valid JSON — no markdown, no preamble."
)

FEEDBACK_USER = (
    "Content Type: {content_type}\n"
    "Cohort Size: {cohort_size}\n"
    "Submission Percentile: {percentile}\n\n"
    "Rubric:\n{rubric_json}\n\n"
    "Submission Content (Preview):\n{submission_content}\n\n"
    "Criterion Scores:\n{criterion_scores_json}\n\n"
    "Please provide personalised feedback returning exactly this JSON format:\n"
    "{{\n"
    '  "narrative_feedback": "<3-5 sentences of personalised feedback>",\n'
    '  "cohort_comparison_summary": "<1-2 sentences on relative standing>"\n'
    "}}"
)

ESSAY_PROMPTS = PromptTemplate(
    individual_score_system=_build_individual_score_system(
        "Pay particular attention to argument structure, evidence quality, and clarity of writing."
    ),
    individual_score_user=INDIVIDUAL_SCORE_USER,
    cluster_compare_system=CLUSTER_COMPARE_SYSTEM,
    cluster_compare_user=CLUSTER_COMPARE_USER,
    feedback_system=FEEDBACK_SYSTEM,
    feedback_user=FEEDBACK_USER
)
