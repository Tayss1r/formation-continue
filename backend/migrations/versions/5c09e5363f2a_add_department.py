"""add_department

Revision ID: 5c09e5363f2a
Revises: g1h2i3j4k5l6
Create Date: 2026-02-05 00:07:15.010842
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5c09e5363f2a'
down_revision: Union[str, Sequence[str], None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



department_enum = postgresql.ENUM(
    'informatique',
    'mecanique',
    'electrique',
    'civil',
    'gestion',
    name='department_type'
)


def upgrade() -> None:
    department_enum.create(op.get_bind(), checkfirst=True)

    # --- course materials table ---
    op.create_table(
        'course_materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column(
            'created_at',
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text('NOW()'),
            nullable=False
        ),
        sa.Column(
            'updated_at',
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text('NOW()'),
            nullable=False
        ),
        sa.ForeignKeyConstraint(
            ['course_id'],
            ['courses.id'],
            ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['uploaded_by_id'],
            ['users.id'],
            ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        op.f('ix_course_materials_course_id'),
        'course_materials',
        ['course_id'],
        unique=False
    )

    # --- courses ---
    op.add_column(
        'courses',
        sa.Column('department', department_enum, nullable=True)
    )

    op.add_column(
        'courses',
        sa.Column(
            'learning_outcomes',
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False
        )
    )

    # --- professors ---
    op.add_column(
        'professors',
        sa.Column('department', department_enum, nullable=True)
    )

    # --- enrollment codes index fix ---
    op.drop_constraint(
        op.f('session_enrollment_codes_code_key'),
        'session_enrollment_codes',
        type_='unique'
    )

    op.drop_index(
        op.f('ix_session_enrollment_codes_code'),
        table_name='session_enrollment_codes'
    )

    op.create_index(
        op.f('ix_session_enrollment_codes_code'),
        'session_enrollment_codes',
        ['code'],
        unique=True
    )


def downgrade() -> None:
    # --- enrollment codes ---
    op.drop_index(
        op.f('ix_session_enrollment_codes_code'),
        table_name='session_enrollment_codes'
    )

    op.create_index(
        op.f('ix_session_enrollment_codes_code'),
        'session_enrollment_codes',
        ['code'],
        unique=False
    )

    op.create_unique_constraint(
        op.f('session_enrollment_codes_code_key'),
        'session_enrollment_codes',
        ['code'],
        postgresql_nulls_not_distinct=False
    )

    # --- drop columns ---
    op.drop_column('professors', 'department')
    op.drop_column('courses', 'learning_outcomes')
    op.drop_column('courses', 'department')

    # --- drop materials ---
    op.drop_index(
        op.f('ix_course_materials_course_id'),
        table_name='course_materials'
    )

    op.drop_table('course_materials')

    department_enum.drop(op.get_bind(), checkfirst=True)
