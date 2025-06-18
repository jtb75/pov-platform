"""
Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2024-06-17
"""

from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('user_email', sa.String, nullable=True),
        sa.Column('action', sa.String, nullable=False),
        sa.Column('details', sa.Text, nullable=True),
        sa.Column('ip_address', sa.String, nullable=True),
    )

def downgrade():
    op.drop_table('audit_logs') 