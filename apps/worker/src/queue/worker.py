import os
import json
import redis
import time
import psycopg2
from dotenv import load_dotenv
from src.jobs.transcribe import run_transcription_job
from src.jobs.summarize import run_chunk_summarization_job, run_final_synthesis_job

load_dotenv()

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
QUEUE_NAME = "ai_jobs"

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")

def format_transcript_for_ai(transcript_data):
    """Converts the list of transcript segments into a single string for Gemini."""
    if not transcript_data:
        return ""
    
    formatted_text = ""
    for entry in transcript_data:
        speaker = entry.get("speaker", "Unknown")
        text = entry.get("text", "")
        formatted_text += f"{speaker}: {text}\n"
    return formatted_text

def start_worker():
    print(f"--- 2D AI Metaverse Worker ---")
    print(f"[*] Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
    
    try:
        r = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            decode_responses=True
        )
        r.ping()
        print("[+] Connected to Redis successfully.")
    except Exception as e:
        print(f"[!] CRITICAL: Failed to connect to Redis: {e}")
        return

    print(f"[*] Listening for jobs on queue: {QUEUE_NAME}")
    
    while True:
        try:
            result = r.brpop(QUEUE_NAME, timeout=2)
            if result:
                _, job_data_raw = result
                job = json.loads(job_data_raw)
                job_type = job.get("type")
                data = job.get("data")
                
                print(f"\n[JOB] RECEIVED: {job_type}")
                
                if job_type == "PROCESS_MEETING":
                    handle_process_meeting(data)
                else:
                    print(f"[!] Unknown job type: {job_type}")
                    
        except Exception as e:
            print(f"[!] Error in worker loop: {e}")
            time.sleep(2)

def save_results_to_db(session_id, transcript, summary):
    if not DATABASE_URL:
        print("[!] Warning: DATABASE_URL not found, summary won't be saved to Postgres.")
        return

    try:
        print(f"[*] Connecting to Postgres to save results...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 1. Insert Transcript segments
        print(f"[*] Saving {len(transcript)} transcript segments to 'Transcript' table...")
        for seg in transcript:
            cur.execute(
                """
                INSERT INTO "Transcript" (id, "sessionId", "speakerLabel", text, timestamp)
                VALUES (gen_random_uuid(), %s, %s, %s, NOW())
                """,
                (session_id, seg['speaker'], seg['text'])
            )

        # 2. Insert Summary
        print(f"[*] Saving summary to 'Summary' table...")
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
        print(f"[SUCCESS] Data saved to Postgres for session {session_id}")
    except Exception as e:
        print(f"[DB ERROR] {e}")

def handle_process_meeting(data):
    session_id = data.get("sessionId")
    file_path = data.get("filePath")
    
    print(f"[*] Starting AI Pipeline for Session: {session_id}")
    
    if not file_path or not isinstance(file_path, str):
        print(f"[!] ABORT: Invalid file path provided: {file_path}")
        return

    if not os.path.exists(file_path):
        print(f"[!] ABORT: File not found at {file_path}")
        return

    try:
        # 1. Transcribe (AssemblyAI)
        print(f"[*] Step 1/3: Transcribing audio via AssemblyAI...")
        transcript = run_transcription_job(file_path)
        print(f"[+] Transcription finished ({len(transcript)} utterances)")
        
        # 2. Summarize (Gemini)
        print(f"[*] Step 2/3: Generating summary via Gemini...")
        # CRITICAL FIX: Convert the list of dicts to a single text block
        transcript_text = format_transcript_for_ai(transcript)
        summary = run_chunk_summarization_job(transcript_text)
        print(f"[+] Summary generated!")
        
        # 3. Save to Database
        print(f"[*] Step 3/3: Storing results in Postgres...")
        save_results_to_db(session_id, transcript, summary)
        
        # 4. Local Backup
        result_path = file_path.replace(".webm", "_summary.json")
        with open(result_path, "w") as f:
            json.dump({
                "sessionId": session_id,
                "transcript": transcript,
                "summary": summary,
                "processedAt": time.time()
            }, f, indent=2)
            
        print(f"[FINISHED] Processed meeting {session_id}")
        
    except Exception as e:
        print(f"[JOB FAILED] {e}")
        import traceback
        traceback.print_exc()
