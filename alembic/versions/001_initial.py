"""initial

Revision ID: 001_initial
Revises: 
Create Date: 2026-04-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Create jobs table
    op.create_table('jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('submission_count', sa.Integer(), nullable=False),
        sa.Column('completed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cluster_count', sa.Integer(), nullable=True),
        sa.Column('rubric', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('anchor_set_id', sa.String(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create submissions table
    op.create_table('submissions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True),
        sa.Column('cluster_id', sa.Integer(), nullable=True),
        sa.Column('is_bridge', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_anchor', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_job_id'), 'submissions', ['job_id'], unique=False)
    
    # ivfflat index on embeddings
    op.execute('CREATE INDEX ON submissions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)')

    # Create results table
    op.create_table('results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('submission_id', sa.String(), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('final_score', sa.Float(), nullable=False),
        sa.Column('max_possible_score', sa.Float(), nullable=False),
        sa.Column('percentile', sa.Float(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('total_in_cohort', sa.Integer(), nullable=False),
        sa.Column('cluster_id', sa.Integer(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('flagged_for_review', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('flag_reason', sa.Text(), nullable=True),
        sa.Column('criterion_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('narrative_feedback', sa.Text(), nullable=False),
        sa.Column('cohort_comparison_summary', sa.Text(), nullable=False),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_results_job_id'), 'results', ['job_id'], unique=False)
    op.create_index(op.f('ix_results_submission_id'), 'results', ['submission_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_results_submission_id'), table_name='results')
    op.drop_index(op.f('ix_results_job_id'), table_name='results')
    op.drop_table('results')
    op.drop_index(op.f('ix_submissions_job_id'), table_name='submissions')
    op.drop_table('submissions')
    op.drop_table('jobs')
