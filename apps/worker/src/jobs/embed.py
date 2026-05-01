import os
import json
import psycopg2
from src.services.gemini import GeminiService

DATABASE_URL = os.getenv("DATABASE_URL")

def chunk_text(text, window_size=500, step=300):
    """
    Chunks text into overlapping windows.
    Returns a list of (chunk_text, word_offset).
    """
    words = text.split()
    chunks = []
    
    if len(words) <= window_size:
        return [(text, 0)]
        
    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + window_size])
        chunks.append((chunk, i))
        if i + window_size >= len(words):
            break
            
    return chunks

def run_indexing_job(workspace_id, session_id, transcript_data, summary_data):
    """
    Chunks and embeds transcripts and summaries, then stores them in Postgres.
    """
    if not DATABASE_URL:
        print("[!] No DATABASE_URL found. Skipping indexing.")
        return

    gemini = GeminiService()
    
    embeddings_to_save = []

    # 1. Index Summary Sections
    # We embed the overview and key points separately for better retrieval
    if summary_data:
        overview = summary_data.get('overview') or summary_data.get('overallSummary')
        if overview:
            vector = gemini.get_embedding(overview)
            if vector:
                embeddings_to_save.append({
                    'workspaceId': workspace_id,
                    'sessionId': session_id,
                    'sourceId': session_id, # Link to summary
                    'sourceType': 'summary',
                    'content': overview,
                    'wordOffset': 0,
                    'vector': vector
                })

        key_points = summary_data.get('keyPoints') or summary_data.get('decisions') or []
        if key_points:
            key_points_text = "Key Points: " + ". ".join(key_points)
            vector = gemini.get_embedding(key_points_text)
            if vector:
                embeddings_to_save.append({
                    'workspaceId': workspace_id,
                    'sessionId': session_id,
                    'sourceId': session_id,
                    'sourceType': 'summary',
                    'content': key_points_text,
                    'wordOffset': 0,
                    'vector': vector
                })

    # 2. Index Transcripts (Chunked)
    if transcript_data:
        # Flatten transcript into one text block for windowed chunking
        # Format: "Speaker: Text"
        full_text = ""
        for seg in transcript_data:
            full_text += f"{seg.get('speaker', 'Unknown')}: {seg.get('text', '')} "
        
        chunks = chunk_text(full_text, window_size=400, step=250)
        
        for chunk_content, word_offset in chunks:
            vector = gemini.get_embedding(chunk_content)
            if vector:
                embeddings_to_save.append({
                    'workspaceId': workspace_id,
                    'sessionId': session_id,
                    'sourceId': session_id, # Link to the session's transcript
                    'sourceType': 'transcript',
                    'content': chunk_content,
                    'wordOffset': word_offset,
                    'vector': vector
                })

    # 3. Batch Save to Database
    if not embeddings_to_save:
        print("[*] No embeddings generated.")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print(f"[*] Saving {len(embeddings_to_save)} embeddings to Postgres...")
        
        for emb in embeddings_to_save:
            cur.execute(
                """
                INSERT INTO "Embedding" (id, "workspaceId", "sessionId", "sourceId", "sourceType", content, "wordOffset", vector, "createdAt")
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s::vector, NOW())
                """,
                (
                    emb['workspaceId'],
                    emb['sessionId'],
                    emb['sourceId'],
                    emb['sourceType'],
                    emb['content'],
                    emb['wordOffset'],
                    emb['vector']
                )
            )
            
        conn.commit()
        cur.close()
        conn.close()
        print(f"[SUCCESS] Indexing complete for session {session_id}")
    except Exception as e:
        print(f"[INDEXING ERROR] {e}")
