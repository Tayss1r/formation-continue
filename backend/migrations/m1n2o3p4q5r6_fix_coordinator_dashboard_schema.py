"""fix_coordinator_dashboard_schema

Revision ID: m1n2o3p4q5r6
Revises: 71ae2c9ae1a1
Create Date: 2026-03-07 16:41:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'm1n2o3p4q5r6'
down_revision: Union[str, Sequence[str], None] = '71ae2c9ae1a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================================================
    # FIX company_applications TABLE
    # ==========================================================================
    
    # Add missing columns
    op.add_column('company_applications', 
        sa.Column('proposed_employee_count', sa.Integer(), nullable=True)
    )
    op.add_column('company_applications', 
        sa.Column('coordinator_id', sa.Integer(), nullable=True)
    )
    op.add_column('company_applications', 
        sa.Column('decision_date', sa.TIMESTAMP(timezone=True), nullable=True)
    )
    op.add_column('company_applications', 
        sa.Column('rejection_reason', sa.Text(), nullable=True)
    )
    
    # Set default value for proposed_employee_count where it's null
    op.execute("UPDATE company_applications SET proposed_employee_count = 1 WHERE proposed_employee_count IS NULL")
    
    # Make proposed_employee_count NOT NULL
    op.alter_column('company_applications', 'proposed_employee_count', nullable=False)
    
    # Rename columns to match model
    op.alter_column('company_applications', 'coordinator_decision', new_column_name='decision_notes')
    
    # Drop columns that are no longer in the model
    op.drop_column('company_applications', 'additional_notes')
    op.drop_column('company_applications', 'reviewed_at')
    
    # Add foreign key for coordinator_id
    op.create_foreign_key(
        'fk_company_applications_coordinator_id',
        'company_applications',
        'users',
        ['coordinator_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Fix submitted_at to be NOT NULL with default
    op.execute("UPDATE company_applications SET submitted_at = created_at WHERE submitted_at IS NULL")
    op.alter_column('company_applications', 'submitted_at', nullable=False)
    
    # Fix status default value
    op.alter_column('company_applications', 'status', server_default='submitted')
    
    # ==========================================================================
    # FIX employee_submissions TABLE
    # ==========================================================================
    
    # Rename application_id to company_application_id
    op.alter_column('employee_submissions', 'application_id', new_column_name='company_application_id')
    
    # Update index name
    op.drop_index('ix_employee_submissions_application_id', table_name='employee_submissions')
    op.create_index('ix_employee_submissions_company_application_id', 'employee_submissions', ['company_application_id'])
    
    # Update unique constraint
    op.drop_constraint('uq_application_employee_submission', 'employee_submissions', type_='unique')
    op.create_unique_constraint('uq_company_application_employee_submission', 'employee_submissions', ['company_application_id', 'employee_id'])
    
    # ==========================================================================
    # FIX application_documents TABLE
    # ==========================================================================
    
    # Add missing columns
    op.add_column('application_documents',
        sa.Column('document_label', sa.String(), nullable=True)
    )
    op.add_column('application_documents',
        sa.Column('file_size', sa.Integer(), nullable=True)
    )
    op.add_column('application_documents',
        sa.Column('mime_type', sa.String(), nullable=True)
    )
    op.add_column('application_documents',
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True)
    )
    op.add_column('application_documents',
        sa.Column('review_notes', sa.Text(), nullable=True)
    )
    
    # Set defaults for new non-nullable columns
    op.execute("UPDATE application_documents SET document_label = document_type WHERE document_label IS NULL")
    op.execute("UPDATE application_documents SET file_size = 0 WHERE file_size IS NULL")
    op.execute("UPDATE application_documents SET mime_type = 'application/octet-stream' WHERE mime_type IS NULL")
    
    # Make new columns NOT NULL
    op.alter_column('application_documents', 'document_label', nullable=False)
    op.alter_column('application_documents', 'file_size', nullable=False)
    op.alter_column('application_documents', 'mime_type', nullable=False)
    
    # Add foreign key for reviewed_by_id
    op.create_foreign_key(
        'fk_application_documents_reviewed_by_id',
        'application_documents',
        'users',
        ['reviewed_by_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Drop rejection_reason column (it's now review_notes)
    op.drop_column('application_documents', 'rejection_reason')
    
    # ==========================================================================
    # FIX audit_logs TABLE
    # ==========================================================================
    
    # Add missing columns
    op.add_column('audit_logs', 
        sa.Column('user_role', sa.String(50), nullable=True)
    )
    op.add_column('audit_logs', 
        sa.Column('old_values', postgresql.JSONB(), nullable=True)
    )
    op.add_column('audit_logs', 
        sa.Column('new_values', postgresql.JSONB(), nullable=True)
    )
    
    # Make user_id NOT NULL (it was nullable before)
    op.execute("DELETE FROM audit_logs WHERE user_id IS NULL")
    op.alter_column('audit_logs', 'user_id', nullable=False)
    
    # Make entity_id NOT NULL
    op.execute("DELETE FROM audit_logs WHERE entity_id IS NULL")
    op.alter_column('audit_logs', 'entity_id', nullable=False)
    
    # Make user_role NOT NULL for remaining records
    op.execute("UPDATE audit_logs SET user_role = 'admin' WHERE user_role IS NULL")
    op.alter_column('audit_logs', 'user_role', nullable=False)
    
    # Drop old columns
    op.drop_column('audit_logs', 'old_status')
    op.drop_column('audit_logs', 'new_status')
    op.drop_column('audit_logs', 'user_agent')
    
    # Add index for action column
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])


def downgrade() -> None:
    # ==========================================================================
    # REVERT audit_logs TABLE
    # ==========================================================================
    
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    
    op.add_column('audit_logs',
        sa.Column('user_agent', sa.String(500), nullable=True)
    )
    op.add_column('audit_logs',
        sa.Column('new_status', sa.String(50), nullable=True)
    )
    op.add_column('audit_logs',
        sa.Column('old_status', sa.String(50), nullable=True)
    )
    
    op.alter_column('audit_logs', 'user_role', nullable=True)
    op.alter_column('audit_logs', 'entity_id', nullable=True)
    op.alter_column('audit_logs', 'user_id', nullable=True)
    
    op.drop_column('audit_logs', 'new_values')
    op.drop_column('audit_logs', 'old_values')
    op.drop_column('audit_logs', 'user_role')
    
    # ==========================================================================
    # REVERT application_documents TABLE
    # ==========================================================================
    
    op.add_column('application_documents',
        sa.Column('rejection_reason', sa.Text(), nullable=True)
    )
    
    op.drop_constraint('fk_application_documents_reviewed_by_id', 'application_documents', type_='foreignkey')
    
    op.drop_column('application_documents', 'review_notes')
    op.drop_column('application_documents', 'reviewed_by_id')
    op.drop_column('application_documents', 'mime_type')
    op.drop_column('application_documents', 'file_size')
    op.drop_column('application_documents', 'document_label')
    
    # ==========================================================================
    # REVERT employee_submissions TABLE
    # ==========================================================================
    
    op.drop_constraint('uq_company_application_employee_submission', 'employee_submissions', type_='unique')
    op.create_unique_constraint('uq_application_employee_submission', 'employee_submissions', ['application_id', 'employee_id'])
    
    op.drop_index('ix_employee_submissions_company_application_id', table_name='employee_submissions')
    op.create_index('ix_employee_submissions_application_id', 'employee_submissions', ['application_id'])
    
    op.alter_column('employee_submissions', 'company_application_id', new_column_name='application_id')
    
    # ==========================================================================
    # REVERT company_applications TABLE
    # ==========================================================================
    
    op.alter_column('company_applications', 'status', server_default='documents_pending')
    op.alter_column('company_applications', 'submitted_at', nullable=True)
    
    op.drop_constraint('fk_company_applications_coordinator_id', 'company_applications', type_='foreignkey')
    
    op.add_column('company_applications',
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )
    op.add_column('company_applications',
        sa.Column('additional_notes', sa.Text(), nullable=True)
    )
    
    op.alter_column('company_applications', 'decision_notes', new_column_name='coordinator_decision')
    
    op.drop_column('company_applications', 'rejection_reason')
    op.drop_column('company_applications', 'decision_date')
    op.drop_column('company_applications', 'coordinator_id')
    op.drop_column('company_applications', 'proposed_employee_count')
