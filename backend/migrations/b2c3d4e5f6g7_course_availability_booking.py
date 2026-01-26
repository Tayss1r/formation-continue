"""Add course availability and company booking models

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    availability_status_enum = sa.Enum(
        'open', 'pending_review', 'confirmed', 'cancelled',
        name='availability_slot_status'
    )
    availability_status_enum.create(op.get_bind(), checkfirst=True)
    
    booking_status_enum = sa.Enum(
        'reserved', 'confirmed', 'cancelled',
        name='booking_status'
    )
    booking_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Create course_availability table
    op.create_table(
        'course_availability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('end_date', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('schedule', sa.String(), nullable=True),
        sa.Column('max_seats', sa.Integer(), nullable=False),
        sa.Column('min_seats', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('reserved_seats', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('booking_deadline', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('status', availability_status_enum, nullable=False, server_default='open'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_course_availability_course_id'), 'course_availability', ['course_id'], unique=False)
    
    # Create company_bookings table
    op.create_table(
        'company_bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('availability_slot_id', sa.Integer(), nullable=False),
        sa.Column('employee_count', sa.Integer(), nullable=False),
        sa.Column('status', booking_status_enum, nullable=False, server_default='reserved'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('staff_notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['availability_slot_id'], ['course_availability.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'availability_slot_id', name='uq_company_slot_booking')
    )
    op.create_index(op.f('ix_company_bookings_availability_slot_id'), 'company_bookings', ['availability_slot_id'], unique=False)
    op.create_index(op.f('ix_company_bookings_company_id'), 'company_bookings', ['company_id'], unique=False)
    
    # Modify courses table:
    # - Add sector column
    # - Remove start_date, end_date, schedule (dates now in availability)
    op.add_column('courses', sa.Column('sector', sa.String(), nullable=True))
    op.create_index(op.f('ix_courses_sector'), 'courses', ['sector'], unique=False)
    
    # Drop old date columns from courses (if they exist)
    # Using try/except since columns may not exist in fresh installs
    try:
        op.drop_column('courses', 'start_date')
    except Exception:
        pass
    
    try:
        op.drop_column('courses', 'end_date')
    except Exception:
        pass
    
    try:
        op.drop_column('courses', 'schedule')
    except Exception:
        pass


def downgrade() -> None:
    # Re-add date columns to courses
    op.add_column('courses', sa.Column('schedule', sa.String(), nullable=True))
    op.add_column('courses', sa.Column('end_date', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('courses', sa.Column('start_date', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Drop sector column and index
    op.drop_index(op.f('ix_courses_sector'), table_name='courses')
    op.drop_column('courses', 'sector')
    
    # Drop company_bookings table
    op.drop_index(op.f('ix_company_bookings_company_id'), table_name='company_bookings')
    op.drop_index(op.f('ix_company_bookings_availability_slot_id'), table_name='company_bookings')
    op.drop_table('company_bookings')
    
    # Drop course_availability table
    op.drop_index(op.f('ix_course_availability_course_id'), table_name='course_availability')
    op.drop_table('course_availability')
    
    # Drop enum types
    sa.Enum(name='booking_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='availability_slot_status').drop(op.get_bind(), checkfirst=True)
