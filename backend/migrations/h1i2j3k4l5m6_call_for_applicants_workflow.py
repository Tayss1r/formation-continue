"""Refactor to Call for Applicants workflow

Revision ID: h1i2j3k4l5m6
Revises: g1h2i3j4k5l6
Create Date: 2025-01-28 10:00:00.000000

This migration:
- Drops old session-based tables (availability, bookings, enrollments, etc.)
- Creates new Call for Applicants workflow tables
- Adds COORDINATOR role to user_role enum
- Adds new status enums for calls, applications, and submissions
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'h1i2j3k4l5m6'
down_revision: Union[str, None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    
    # ==========================================================================
    # DROP OLD SESSION-BASED TABLES (in reverse dependency order)
    # ==========================================================================
    
    # Drop session_attendance if exists
    op.execute("DROP TABLE IF EXISTS session_attendance CASCADE")
    
    # Drop employee_documents if exists
    op.execute("DROP TABLE IF EXISTS employee_documents CASCADE")
    
    # Drop session_enrollments if exists
    op.execute("DROP TABLE IF EXISTS session_enrollments CASCADE")
    
    # Drop session_enrollment_codes if exists
    op.execute("DROP TABLE IF EXISTS session_enrollment_codes CASCADE")
    
    # Drop company_bookings if exists
    op.execute("DROP TABLE IF EXISTS company_bookings CASCADE")
    
    # Drop course_availability if exists
    op.execute("DROP TABLE IF EXISTS course_availability CASCADE")
    
    # Drop old training_request related tables if they exist
    op.execute("DROP TABLE IF EXISTS training_requests CASCADE")
    op.execute("DROP TABLE IF EXISTS enrollment_codes CASCADE")
    op.execute("DROP TABLE IF EXISTS enrollments CASCADE")
    
    # ==========================================================================
    # ADD COORDINATOR TO USER_ROLE ENUM
    # ==========================================================================
    
    # Check if coordinator already exists in enum
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_enum WHERE enumlabel = 'coordinator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')")
    )
    if not result.fetchone():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordinator'")
    
    # ==========================================================================
    # CREATE NEW ENUM TYPES
    # ==========================================================================
    
    # Create call_status enum
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'call_status'")
    )
    if not result.fetchone():
        call_status = sa.Enum(
            'draft', 'published', 'closed', 'under_review', 'results_published',
            name='call_status'
        )
        call_status.create(op.get_bind(), checkfirst=True)
    
    # Create application_status enum
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'application_status'")
    )
    if not result.fetchone():
        application_status = sa.Enum(
            'pending', 'submitted', 'under_review', 'additional_info_requested',
            'approved', 'rejected', 'withdrawn',
            name='application_status'
        )
        application_status.create(op.get_bind(), checkfirst=True)
    
    # Create document_review_status enum
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'document_review_status'")
    )
    if not result.fetchone():
        document_review_status = sa.Enum(
            'pending', 'approved', 'rejected', 'requires_resubmission',
            name='document_review_status'
        )
        document_review_status.create(op.get_bind(), checkfirst=True)
    
    # Create employee_submission_status enum
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'employee_submission_status'")
    )
    if not result.fetchone():
        employee_submission_status = sa.Enum(
            'pending', 'submitted', 'approved', 'rejected', 'withdrawn',
            name='employee_submission_status'
        )
        employee_submission_status.create(op.get_bind(), checkfirst=True)
    
    # Use enums with create_type=False since we created them above
    call_status_enum = sa.Enum(
        'draft', 'published', 'closed', 'under_review', 'results_published',
        name='call_status', create_type=False
    )
    application_status_enum = sa.Enum(
        'pending', 'submitted', 'under_review', 'additional_info_requested',
        'approved', 'rejected', 'withdrawn',
        name='application_status', create_type=False
    )
    document_review_status_enum = sa.Enum(
        'pending', 'approved', 'rejected', 'requires_resubmission',
        name='document_review_status', create_type=False
    )
    employee_submission_status_enum = sa.Enum(
        'pending', 'submitted', 'approved', 'rejected', 'withdrawn',
        name='employee_submission_status', create_type=False
    )
    department_enum = sa.Enum(
        'informatique', 'mathematiques', 'physique', 'biologie',
        'chimie', 'lettres', 'economie', 'droit', 'medecine', 'general',
        name='department', create_type=False
    )
    
    # ==========================================================================
    # CREATE NEW TABLES
    # ==========================================================================
    
    # Create calls_for_applicants table
    op.create_table(
        'calls_for_applicants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('reference_number', sa.String(100), nullable=False),
        sa.Column('department', department_enum, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('eligibility_criteria', sa.Text(), nullable=True),
        sa.Column('required_documents', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('employee_required_documents', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('application_start_date', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('application_deadline', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('results_publication_date', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('status', call_status_enum, nullable=False, server_default='draft'),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
        sa.Column('published_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference_number')
    )
    op.create_index('ix_calls_for_applicants_department', 'calls_for_applicants', ['department'], unique=False)
    op.create_index('ix_calls_for_applicants_status', 'calls_for_applicants', ['status'], unique=False)
    op.create_index('ix_calls_for_applicants_deadline', 'calls_for_applicants', ['application_deadline'], unique=False)
    
    # Create company_applications table
    op.create_table(
        'company_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('call_id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('status', application_status_enum, nullable=False, server_default='pending'),
        sa.Column('motivation_letter', sa.Text(), nullable=True),
        sa.Column('additional_notes', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('coordinator_decision', sa.Text(), nullable=True),
        sa.Column('decision_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['call_id'], ['calls_for_applicants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('call_id', 'company_id', name='uq_call_company_application')
    )
    op.create_index('ix_company_applications_call_id', 'company_applications', ['call_id'], unique=False)
    op.create_index('ix_company_applications_company_id', 'company_applications', ['company_id'], unique=False)
    op.create_index('ix_company_applications_status', 'company_applications', ['status'], unique=False)
    
    # Create application_documents table
    op.create_table(
        'application_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(100), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('review_status', document_review_status_enum, nullable=False, server_default='pending'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('uploaded_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['company_applications.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_application_documents_application_id', 'application_documents', ['application_id'], unique=False)
    
    # Create employee_submissions table
    op.create_table(
        'employee_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('status', employee_submission_status_enum, nullable=False, server_default='pending'),
        sa.Column('submitted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('coordinator_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['company_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employee_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', 'employee_id', name='uq_application_employee_submission')
    )
    op.create_index('ix_employee_submissions_application_id', 'employee_submissions', ['application_id'], unique=False)
    op.create_index('ix_employee_submissions_employee_id', 'employee_submissions', ['employee_id'], unique=False)
    op.create_index('ix_employee_submissions_status', 'employee_submissions', ['status'], unique=False)
    
    # Create employee_submission_documents table
    op.create_table(
        'employee_submission_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('submission_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(100), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('review_status', document_review_status_enum, nullable=False, server_default='pending'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('uploaded_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['submission_id'], ['employee_submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_employee_submission_documents_submission_id', 'employee_submission_documents', ['submission_id'], unique=False)
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('old_status', sa.String(50), nullable=True),
        sa.Column('new_status', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'], unique=False)
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'], unique=False)
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'], unique=False)


def downgrade() -> None:
    """
    WARNING: This downgrade will permanently delete all Call for Applicants data.
    The old session-based tables will NOT be recreated as they are deprecated.
    """
    # Drop new tables
    op.drop_table('audit_logs')
    op.drop_table('employee_submission_documents')
    op.drop_table('employee_submissions')
    op.drop_table('application_documents')
    op.drop_table('company_applications')
    op.drop_table('calls_for_applicants')
    
    # Note: We don't recreate the old tables in downgrade
    # as the system is fully transitioning to the new workflow
    
    # Drop new enum types
    op.execute("DROP TYPE IF EXISTS employee_submission_status")
    op.execute("DROP TYPE IF EXISTS document_review_status")
    op.execute("DROP TYPE IF EXISTS application_status")
    op.execute("DROP TYPE IF EXISTS call_status")
    
    # Note: Cannot remove 'coordinator' from user_role enum easily in PostgreSQL
    # Would require recreation of the enum type
