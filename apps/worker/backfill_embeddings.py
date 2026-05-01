import os
import json
import psycopg2
import psycopg2.extras
from src.jobs.embed import run_indexing_job
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def backfill_embeddings():
    if not DATABASE_URL:
        print("[!] DATABASE_URL not found.")
        return

    print("--- RoomMind Historical Indexing ---")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # 1. Get all sessions that have summaries but NO embeddings yet
        print("[*] Fetching sessions needing indexing...")
        cur.execute("""
            SELECT s.id, s."workspaceId", sum.raw as summary_raw
            FROM "Session" s
            JOIN "Summary" sum ON s.id = sum."sessionId"
            LEFT JOIN "Embedding" emb ON s.id = emb."sessionId"
            WHERE emb.id IS NULL
        """)
        
        sessions = cur.fetchall()
        print(f"[*] Found {len(sessions)} sessions to index.")
        
        for sess in sessions:
            session_id = sess['id']
            workspace_id = sess['workspaceId']
            summary_data = sess['summary_raw']
            
            # Fetch transcripts for this session
            cur.execute("""
                SELECT "speakerLabel" as speaker, text 
                FROM "Transcript" 
                WHERE "sessionId" = %s 
                ORDER BY timestamp ASC
            """, (session_id,))
            transcripts = cur.fetchall()
            
            print(f"[*] Indexing Session: {session_id} ({len(transcripts)} segments)")
            
            # Run the indexing logic
            run_indexing_job(workspace_id, session_id, transcripts, summary_data)
            
        conn.close()
        print("\n[SUCCESS] Historical indexing complete!")
        
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    backfill_embeddings()
