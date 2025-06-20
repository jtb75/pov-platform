"""add columns to users table

Revision ID: 5e3a3e6b7f3d
Revises: 20240619_create_success_criteria_tables
Create Date: 2024-06-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5e3a3e6b7f3d'
down_revision = '20240619_create_success_criteria_tables'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))
    op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'created_at') 