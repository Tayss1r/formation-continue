"""add_feedback_and_attendance_tables

Revision ID: f7e8d9c0a1b2
Revises: b2c3d4e5f6g7
Create Date: 2026-02-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e8d9c0a1b2'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create course_feedback table
    op.create_table(
        'course_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=True),
        sa.Column('is_anonymous', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.String(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employee_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id', 'employee_id', name='uq_course_employee_feedback')
    )
    op.create_index(op.f('ix_course_feedback_course_id'), 'course_feedback', ['course_id'], unique=False)
    op.create_index(op.f('ix_course_feedback_employee_id'), 'course_feedback', ['employee_id'], unique=False)

    # Create session_attendance table
    op.create_table(
        'session_attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('is_present', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('marked_by_id', sa.Integer(), nullable=True),
        sa.Column('marked_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['course_availability.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employee_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['marked_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id', 'employee_id', name='uq_session_employee_attendance')
    )
    op.create_index(op.f('ix_session_attendance_session_id'), 'session_attendance', ['session_id'], unique=False)
    op.create_index(op.f('ix_session_attendance_employee_id'), 'session_attendance', ['employee_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_session_attendance_employee_id'), table_name='session_attendance')
    op.drop_index(op.f('ix_session_attendance_session_id'), table_name='session_attendance')
    op.drop_table('session_attendance')
    
    op.drop_index(op.f('ix_course_feedback_employee_id'), table_name='course_feedback')
    op.drop_index(op.f('ix_course_feedback_course_id'), table_name='course_feedback')
    op.drop_table('course_feedback')
