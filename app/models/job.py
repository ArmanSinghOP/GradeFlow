from sqlalchemy import String, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, CommonMixin

class Job(CommonMixin, Base):
    __tablename__ = "jobs"
    
    status: Mapped[str] = mapped_column(String)
    submission_count: Mapped[int] = mapped_column(Integer)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    cluster_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rubric: Mapped[dict] = mapped_column(JSONB)
    content_type: Mapped[str] = mapped_column(String)
    anchor_set_id: Mapped[str | None] = mapped_column(String, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
