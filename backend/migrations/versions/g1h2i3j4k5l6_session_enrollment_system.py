"""Add session enrollment system with employee documents

Revision ID: g1h2i3j4k5l6
Revises: 528fb39cac70
Create Date: 2026-01-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = '528fb39cac70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create document_status enum if it doesn't exist
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'document_status'")
    )
    if not result.fetchone():
        document_status_enum = sa.Enum(
            'pending_review', 'verified', 'rejected',
            name='document_status'
        )
        document_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Use the existing enum type
    document_status_enum = sa.Enum(
        'pending_review', 'verified', 'rejected',
        name='document_status',
        create_type=False
    )

    # Create employee_profiles table
    op.create_table(
        'employee_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create session_enrollment_codes table
    op.create_table(
        'session_enrollment_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('availability_slot_id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('max_usage', sa.Integer(), nullable=False),
        sa.Column('used_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['availability_slot_id'], ['course_availability.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['company_bookings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('availability_slot_id', 'company_id', name='uq_session_company_code')
    )
    op.create_index('ix_session_enrollment_codes_code', 'session_enrollment_codes', ['code'], unique=False)
    op.create_index('ix_session_enrollment_codes_availability_slot_id', 'session_enrollment_codes', ['availability_slot_id'], unique=False)
    op.create_index('ix_session_enrollment_codes_company_id', 'session_enrollment_codes', ['company_id'], unique=False)

    # Create session_enrollments table
    op.create_table(
        'session_enrollments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('availability_slot_id', sa.Integer(), nullable=False),
        sa.Column('enrollment_code_id', sa.Integer(), nullable=False),
        sa.Column('enrolled_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employee_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['availability_slot_id'], ['course_availability.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['enrollment_code_id'], ['session_enrollment_codes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id', 'availability_slot_id', name='uq_employee_session_enrollment')
    )
    op.create_index('ix_session_enrollments_employee_id', 'session_enrollments', ['employee_id'], unique=False)
    op.create_index('ix_session_enrollments_availability_slot_id', 'session_enrollments', ['availability_slot_id'], unique=False)

    # Create employee_documents table
    # Use raw SQL for the enum column to avoid SQLAlchemy trying to create it
    op.create_table(
        'employee_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('enrollment_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.String(), nullable=True),
        sa.Column('uploaded_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['enrollment_id'], ['session_enrollments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('enrollment_id')
    )
    
    # Alter column to use enum type (without the default first)
    op.execute("ALTER TABLE employee_documents ALTER COLUMN status TYPE document_status USING status::document_status")
    op.execute("ALTER TABLE employee_documents ALTER COLUMN status SET DEFAULT 'pending_review'::document_status")


def downgrade() -> None:
    op.drop_table('employee_documents')
    op.drop_table('session_enrollments')
    op.drop_table('session_enrollment_codes')
    op.drop_table('employee_profiles')
    
    # Drop enum
    sa.Enum(name='document_status').drop(op.get_bind(), checkfirst=True)
