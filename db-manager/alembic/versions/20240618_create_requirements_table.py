from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = 'c3d4e5f6g7h8'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'requirements',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('category', sa.String, nullable=False),
        sa.Column('requirement', sa.String, nullable=False),
        sa.Column('product', sa.String, nullable=True),
        sa.Column('doc_link', sa.String, nullable=True),
        sa.Column('tenant_link', sa.String, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, default=datetime.utcnow),
        sa.Column('created_by', sa.String, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
        sa.Column('updated_by', sa.String, nullable=True),
    )

def downgrade():
    op.drop_table('requirements') 