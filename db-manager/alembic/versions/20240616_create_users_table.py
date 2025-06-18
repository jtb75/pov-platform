"""
Revision ID: 20240616_create_users_table
Revises: 
Create Date: 2024-06-16
"""

from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('email', sa.String, unique=True, index=True, nullable=False),
        sa.Column('name', sa.String, nullable=True),
        sa.Column('picture', sa.String, nullable=True),
        sa.Column('role', sa.String, nullable=False, server_default='normal'),
    )

def downgrade():
    op.drop_table('users') 