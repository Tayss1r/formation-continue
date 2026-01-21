"""Add course enhancements for training platform

Revision ID: a1b2c3d4e5f6
Revises: 256523fe1926
Create Date: 2026-01-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '256523fe1926'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to courses table
    op.add_column('courses', sa.Column('short_description', sa.String(), nullable=True))
    op.add_column('courses', sa.Column('image_path', sa.String(), nullable=True))
    op.add_column('courses', sa.Column('duration_hours', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('schedule', sa.String(), nullable=True))
    op.add_column('courses', sa.Column('start_date', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('courses', sa.Column('end_date', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('courses', sa.Column('created_by_id', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False))
    op.add_column('courses', sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False))
    op.add_column('courses', sa.Column('is_published', sa.Boolean(), server_default='true', nullable=False))
    
    # Add foreign key constraint for created_by_id
    op.create_foreign_key(
        'fk_courses_created_by_id_users',
        'courses',
        'users',
        ['created_by_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_courses_created_by_id_users', 'courses', type_='foreignkey')
    
    # Drop columns
    op.drop_column('courses', 'is_published')
    op.drop_column('courses', 'updated_at')
    op.drop_column('courses', 'created_at')
    op.drop_column('courses', 'created_by_id')
    op.drop_column('courses', 'end_date')
    op.drop_column('courses', 'start_date')
    op.drop_column('courses', 'schedule')
    op.drop_column('courses', 'duration_hours')
    op.drop_column('courses', 'image_path')
    op.drop_column('courses', 'short_description')
