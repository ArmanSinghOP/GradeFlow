from app.prompts.base import PromptTemplate
from app.prompts.essay import ESSAY_PROMPTS
from app.prompts.code import CODE_PROMPTS
from app.prompts.report import REPORT_PROMPTS
from app.prompts.interview import INTERVIEW_PROMPTS

def get_prompts(content_type: str) -> PromptTemplate:
    mapping = {
        "essay": ESSAY_PROMPTS,
        "code": CODE_PROMPTS,
        "report": REPORT_PROMPTS,
        "interview": INTERVIEW_PROMPTS
    }
    content_type_lower = content_type.lower()
    if content_type_lower not in mapping:
        raise ValueError(f"Unknown content_type: {content_type}")
    return mapping[content_type_lower]
