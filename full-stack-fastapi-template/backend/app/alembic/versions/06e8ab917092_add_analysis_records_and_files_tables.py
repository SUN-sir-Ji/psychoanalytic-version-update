"""add analysis_records and files tables

Revision ID: 06e8ab917092
Revises: fe56fa70289e
Create Date: 2026-03-30 10:09:50.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

revision = '06e8ab917092'
down_revision = 'fe56fa70289e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'analysis_records',
        sa.Column('record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('person_name', sa.String(length=50), nullable=False),
        sa.Column('gender', sa.String(length=20), nullable=False),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('birth_date', sa.DateTime(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('analysis_result', sa.Text(), nullable=True),
        sa.Column('text_analysis_result', sa.Text(), nullable=True),
        sa.Column('audio_analysis_result', sa.Text(), nullable=True),
        sa.Column('video_analysis_result', sa.Text(), nullable=True),
        sa.Column('record_time', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('record_id')
    )
    op.create_table(
        'files',
        sa.Column('file_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('file_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['record_id'], ['analysis_records.record_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('file_id')
    )


def downgrade():
    op.drop_table('files')
    op.drop_table('analysis_records')
