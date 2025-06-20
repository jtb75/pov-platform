# Use official Python image
FROM python:3.11-slim

WORKDIR /app

COPY db-manager/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY db-manager/. .
COPY backend/. ./backend

# Use a non-root user
RUN useradd -m appuser
USER appuser

ENV PYTHONPATH="/app"

CMD ["alembic", "upgrade", "head"]

HEALTHCHECK CMD ["true"] 