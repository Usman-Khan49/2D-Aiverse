FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Set PYTHONPATH to include the current directory so 'src' can be imported
ENV PYTHONPATH=/app

CMD ["celery", "-A", "src.queue.worker", "worker", "--loglevel=info", "--queues=ai_jobs", "--concurrency=2"]
