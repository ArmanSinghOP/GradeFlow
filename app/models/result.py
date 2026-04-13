import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, ForeignKey, Integer, Float, DateTime, text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, CommonMixin

class Result(CommonMixin, Base):
    __tablename__ = "results"
    
    submission_id: Mapped[str] = mapped_column(String, ForeignKey("submissions.id"), index=True)
    job_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("jobs.id"), index=True)
    final_score: Mapped[float] = mapped_column(Float)
    max_possible_score: Mapped[float] = mapped_column(Float)
    percentile: Mapped[float] = mapped_column(Float)
    rank: Mapped[int] = mapped_column(Integer)
    total_in_cohort: Mapped[int] = mapped_column(Integer) # if the instruction expects this here
    cluster_id: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[float] = mapped_column(Float)
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    criterion_scores: Mapped[list[dict]] = mapped_column(JSONB)
    narrative_feedback: Mapped[str] = mapped_column(Text)
    cohort_comparison_summary: Mapped[str] = mapped_column(Text)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
