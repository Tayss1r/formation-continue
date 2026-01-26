"""add newsletter subscription table

Revision ID: f7a8b9c0d1e2
Revises: a1b2c3d4e5f6
Create Date: 2026-01-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create newsletter_subscriptions table"""
    op.create_table(
        'newsletter_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('sector', sa.String(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('subscribed_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('unsubscribed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_newsletter_email')
    )
    op.create_index('ix_newsletter_subscriptions_email', 'newsletter_subscriptions', ['email'], unique=False)
    op.create_index('ix_newsletter_subscriptions_sector', 'newsletter_subscriptions', ['sector'], unique=False)


def downgrade() -> None:
    """Drop newsletter_subscriptions table"""
    op.drop_index('ix_newsletter_subscriptions_sector', table_name='newsletter_subscriptions')
    op.drop_index('ix_newsletter_subscriptions_email', table_name='newsletter_subscriptions')
    op.drop_table('newsletter_subscriptions')
