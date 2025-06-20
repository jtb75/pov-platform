"""create scd tables

Revision ID: 20240722_create_scd_tables
Revises: 20240722_drop_success_criteria
Create Date: 2024-07-22 12:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20240722_create_scd_tables'
down_revision = '20240722_drop_success_criteria'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('success_criteria_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_success_criteria_documents_id'), 'success_criteria_documents', ['id'], unique=False)

    op.create_table('scd_requirements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('requirement', sa.Text(), nullable=False),
        sa.Column('product', sa.String(), nullable=True),
        sa.Column('doc_link', sa.String(), nullable=True),
        sa.Column('tenant_link', sa.String(), nullable=True),
        sa.Column('original_requirement_id', sa.Integer(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['success_criteria_documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scd_requirements_id'), 'scd_requirements', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_scd_requirements_id'), table_name='scd_requirements')
    op.drop_table('scd_requirements')
    op.drop_index(op.f('ix_success_criteria_documents_id'), table_name='success_criteria_documents')
    op.drop_table('success_criteria_documents') 