"""add_call_for_applicants_workflow

Revision ID: 71ae2c9ae1a1
Revises: f7e8d9c0a1b2
Create Date: 2026-03-01 15:58:18.871817

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '71ae2c9ae1a1'
down_revision: Union[str, Sequence[str], None] = 'f7e8d9c0a1b2'
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
    # ADD COORDINATOR TO USER_ROLES ENUM
    # ==========================================================================
    
    # Check if coordinator already exists in enum
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_enum WHERE enumlabel = 'coordinator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_roles')")
    )
    if not result.fetchone():
        op.execute("ALTER TYPE user_roles ADD VALUE IF NOT EXISTS 'coordinator'")
    
    # ==========================================================================
    # DROP INCORRECTLY NAMED ENUMS FROM PREVIOUS FAILED RUNS (if any)
    # ==========================================================================
    op.execute("DROP TYPE IF EXISTS call_status CASCADE")
    op.execute("DROP TYPE IF EXISTS application_status CASCADE")
    op.execute("DROP TYPE IF EXISTS document_review_status CASCADE")
    op.execute("DROP TYPE IF EXISTS employee_submission_status CASCADE")
    
    # Also drop _type suffixed enums in case of partial runs
    op.execute("DROP TYPE IF EXISTS call_status_type CASCADE")
    op.execute("DROP TYPE IF EXISTS application_status_type CASCADE")
    op.execute("DROP TYPE IF EXISTS document_review_status_type CASCADE")
    op.execute("DROP TYPE IF EXISTS employee_submission_status_type CASCADE")
    # Don't drop department_type as it may be in use by other tables
    
    # ==========================================================================
    # CREATE NEW ENUM TYPES (matching models.py names with _type suffix)
    # ==========================================================================
    
    # Helper function to safely create enum
    def create_enum_if_not_exists(enum_name: str, values: list):
        result = connection.execute(
            sa.text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'")
        )
        if not result.fetchone():
            values_str = ", ".join([f"'{v}'" for v in values])
            connection.execute(sa.text(f"CREATE TYPE {enum_name} AS ENUM ({values_str})"))
    
    # Create call_status_type enum
    create_enum_if_not_exists('call_status_type', ['draft', 'published', 'closed', 'under_review', 'results_published'])
    
    # Create application_status_type enum
    create_enum_if_not_exists('application_status_type', ['submitted', 'documents_pending', 'under_review', 'additional_info_required', 'approved', 'rejected'])
    
    # Create document_review_status_type enum
    create_enum_if_not_exists('document_review_status_type', ['pending', 'approved', 'rejected', 'revision_required'])
    
    # Create employee_submission_status_type enum
    create_enum_if_not_exists('employee_submission_status_type', ['pending', 'submitted', 'under_review', 'approved', 'rejected'])
    
    # department_type already exists from previous migrations - don't recreate
    
    # Use postgresql.ENUM with create_type=False to avoid SQLAlchemy trying to create types
    call_status_enum = postgresql.ENUM(
        'draft', 'published', 'closed', 'under_review', 'results_published',
        name='call_status_type', create_type=False
    )
    application_status_enum = postgresql.ENUM(
        'submitted', 'documents_pending', 'under_review', 'additional_info_required',
        'approved', 'rejected',
        name='application_status_type', create_type=False
    )
    document_review_status_enum = postgresql.ENUM(
        'pending', 'approved', 'rejected', 'revision_required',
        name='document_review_status_type', create_type=False
    )
    employee_submission_status_enum = postgresql.ENUM(
        'pending', 'submitted', 'under_review', 'approved', 'rejected',
        name='employee_submission_status_type', create_type=False
    )
    department_enum = postgresql.ENUM(
        'informatique', 'mecanique', 'electrique', 'civil', 'gestion',
        name='department_type', create_type=False
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
        sa.Column('status', application_status_enum, nullable=False, server_default='documents_pending'),
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
    op.execute("DROP TYPE IF EXISTS employee_submission_status_type")
    op.execute("DROP TYPE IF EXISTS document_review_status_type")
    op.execute("DROP TYPE IF EXISTS application_status_type")
    op.execute("DROP TYPE IF EXISTS call_status_type")
    # Don't drop department_type as it may be used by other tables
    
    # Note: Cannot remove 'coordinator' from user_role enum easily in PostgreSQL
    # Would require recreation of the enum type
