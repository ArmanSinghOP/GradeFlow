import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, ForeignKey, Integer, DateTime, text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.models.base import Base

class Submission(Base):
    __tablename__ = "submissions"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("jobs.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(String)
    metadata_json: Mapped[dict] = mapped_column(JSONB)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    cluster_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_bridge: Mapped[bool] = mapped_column(Boolean, default=False)
    is_anchor: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
