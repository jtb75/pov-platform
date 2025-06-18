"""
create success_criteria and success_criteria_requirements tables
"""
from alembic import op
import sqlalchemy as sa

revision = '20240619_create_success_criteria_tables'
down_revision = 'c3d4e5f6g7h8'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column('alembic_version', 'version_num', type_=sa.String(128))
    op.create_table(
        'success_criteria',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('shared_with', sa.Text(), nullable=True),
    )
    op.create_table(
        'success_criteria_requirements',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('success_criteria_id', sa.Integer(), sa.ForeignKey('success_criteria.id'), nullable=False),
        sa.Column('requirement_id', sa.Integer(), sa.ForeignKey('requirements.id'), nullable=True),
        sa.Column('custom_text', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=True),
    )

def downgrade():
    op.drop_table('success_criteria_requirements')
    op.drop_table('success_criteria')
    op.alter_column('alembic_version', 'version_num', type_=sa.String(32)) 