#!/bin/bash
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Starting GradeFlow API..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --loop uvloop \
  --http httptools \
  --no-access-log \
  --proxy-headers \
  --forwarded-allow-ips="*"
