#!/bin/bash

# Start the Celery worker in the background
# It's important to run this in the background so uvicorn can run in the foreground.
# Note: For this to work efficiently on Cloud Run, you MUST deploy with --no-cpu-throttling 
# (i.e. "CPU always allocated") so the worker isn't paused between HTTP requests.
celery -A celery_worker.app worker --loglevel=info --concurrency=2 &

# Start the FastAPI web server
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
