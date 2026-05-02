import os
import json
import psycopg2
from celery import Celery
from dotenv import load_dotenv
from src.jobs.transcribe import run_transcription_job
from src.jobs.summarize import run_chunk_summarization_job
from src.jobs.embed import run_indexing_job
from src.services.notify import NotifyService

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

if os.getenv("REDIS_URL"):
    REDIS_URL = os.getenv("REDIS_URL")
elif REDIS_PASSWORD:
    REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
else:
    REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize Celery
app = Celery(
    "roommind_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="ai_jobs",
)

@app.task(name="process_meeting_pipeline")
def process_meeting_pipeline(data):
    """
    Orchestrates the entire meeting processing pipeline.
    This replaces the old manual brpop loop.
    """
    session_id = data.get("sessionId")
    file_path = data.get("filePath")
    workspace_id = data.get("workspaceId")

    print(f"[*] Starting Celery Pipeline for Session: {session_id}")

    try:
        # 1. Transcribe (AssemblyAI)
        print(f"[*] Step 1/4: Transcribing audio...")
        transcript = run_transcription_job(file_path)
        
        # 2. Summarize (Gemini)
        print(f"[*] Step 2/4: Generating summary...")
        formatted_text = ""
        for entry in transcript:
            speaker = entry.get("speaker", "Unknown")
            text = entry.get("text", "")
            formatted_text += f"{speaker}: {text}\n"
        
        summary = run_chunk_summarization_job(formatted_text)

        # 3. Save to Database
        print(f"[*] Step 3/4: Storing results in Postgres...")
        save_results_to_db(session_id, transcript, summary)

        # 4. Index for RAG (pgvector)
        if workspace_id:
            print(f"[*] Step 4/4: Indexing for RAG...")
            run_indexing_job(workspace_id, session_id, transcript, summary)
        
        # 5. Notify Backend via Webhook/Socket
        notifier = NotifyService()
        notifier.notify_summary_ready(session_id)

        print(f"[SUCCESS] Pipeline completed for session {session_id}")
        return {"status": "completed", "sessionId": session_id}

    except Exception as e:
        print(f"[CELERY ERROR] Pipeline failed: {e}")
        raise e

def save_results_to_db(session_id, transcript, summary):
    if not DATABASE_URL:
        print("[!] Warning: DATABASE_URL not found.")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Insert Transcript
        for seg in transcript:
            cur.execute(
                "INSERT INTO \"Transcript\" (id, \"sessionId\", \"speakerLabel\", text, timestamp) VALUES (gen_random_uuid(), %s, %s, %s, NOW())",
                (session_id, seg['speaker'], seg['text'])
            )

        # Insert Summary
        cur.execute(
            """
            INSERT INTO "Summary" (id, "sessionId", decisions, "openQuestions", risks, raw, "createdAt")
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("sessionId") DO UPDATE SET
                decisions = EXCLUDED.decisions,
                "openQuestions" = EXCLUDED."openQuestions",
                risks = EXCLUDED.risks,
                raw = EXCLUDED.raw,
                "createdAt" = NOW()
            """,
            (
                session_id,
                summary.get('decisions', []),
                summary.get('openQuestions', []),
                summary.get('risks', []),
                json.dumps(summary)
            )
        )

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[DB ERROR] {e}")
        raise e

if __name__ == "__main__":
    app.start()
