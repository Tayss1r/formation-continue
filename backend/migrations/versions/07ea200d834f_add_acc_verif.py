"""add account_status and verification_document to users

Revision ID: b2c3d4e5f6g7
Revises: d9994e916e21
Create Date: 2026-02-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'd9994e916e21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the account_status enum type
    account_status_enum = sa.Enum('pending', 'active', 'rejected', 'blocked', name='account_status_type')
    account_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Add account_status column with default 'active'
    op.add_column('users', sa.Column(
        'account_status',
        sa.Enum('pending', 'active', 'rejected', 'blocked', name='account_status_type'),
        server_default='active',
        nullable=False
    ))
    
    # Add verification_document column
    op.add_column('users', sa.Column(
        'verification_document',
        sa.String(),
        nullable=True
    ))


def downgrade() -> None:
    op.drop_column('users', 'verification_document')
    op.drop_column('users', 'account_status')
    
    # Drop the enum type
    account_status_enum = sa.Enum('pending', 'active', 'rejected', 'blocked', name='account_status_type')
    account_status_enum.drop(op.get_bind(), checkfirst=True)
