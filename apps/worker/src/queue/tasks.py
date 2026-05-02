import os
import json
import psycopg2
from .celery_app import app
from src.jobs.transcribe import run_transcription_job
from src.jobs.summarize import run_chunk_summarization_job
from src.jobs.embed import run_indexing_job
from src.services.notify import NotifyService

DATABASE_URL = os.getenv("DATABASE_URL")

@app.task(name="process_meeting_pipeline", queue="ai_jobs")
def process_meeting_pipeline(data):
    """Orchestrates the entire meeting processing pipeline."""
    session_id = data.get("sessionId")
    file_path = data.get("filePath")
    workspace_id = data.get("workspaceId")

    print(f"[*] Starting Celery Pipeline for Session: {session_id}")

    # 1. Transcribe
    transcript = run_transcription_job(file_path)
    
    # 2. Summarize
    formatted_text = ""
    for entry in transcript:
        speaker = entry.get("speaker", "Unknown")
        text = entry.get("text", "")
        formatted_text += f"{speaker}: {text}\n"
    
    summary = run_chunk_summarization_job(formatted_text)

    # 3. Save to DB
    save_results_to_db(session_id, transcript, summary)

    # 4. Index for RAG
    if workspace_id:
        run_indexing_job(workspace_id, session_id, transcript, summary)

    # 5. Notify Backend
    notifier = NotifyService()
    notifier.notify_summary_ready(session_id)

    return {"status": "completed", "sessionId": session_id}

def save_results_to_db(session_id, transcript, summary):
    if not DATABASE_URL:
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
            (session_id, summary.get('decisions', []), summary.get('openQuestions', []), summary.get('risks', []), json.dumps(summary))
        )

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[DB ERROR] {e}")
