import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def load_transcript(file_path="transcript_output.json"):
    """Loads the transcript from a JSON file."""
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r") as f:
        return json.load(f)

def format_transcript_for_llm(transcript_data):
    """Formats the transcript into a text block for context."""
    if not transcript_data:
        return ""
    
    formatted_text = "--- TRANSCRIPT START ---\n"
    for entry in transcript_data:
        speaker = entry.get("speaker", "Unknown")
        text = entry.get("text", "")
        formatted_text += f"{speaker}: {text}\n"
    formatted_text += "--- TRANSCRIPT END ---"
    return formatted_text

def ask_question(question, transcript_path="transcript_output.json"):
    """Uses Gemini to answer a question about the transcript."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return "Error: GOOGLE_API_KEY not found in .env file."

    transcript_data = load_transcript(transcript_path)
    if not transcript_data:
        return "Error: No transcript found. Please run transcribe.py first."

    context = format_transcript_for_llm(transcript_data)
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-flash-latest")
    
    prompt = f"""
    You are an AI assistant helping with a transcript analysis.
    Below is a transcript of a conversation with speaker labels (e.g., A1, A2).
    
    {context}
    
    Based ONLY on the transcript above, answer the following question:
    Question: {question}
    
    If the answer is not in the transcript, say "I don't have enough information in the transcript to answer that."
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini: {e}"

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python qna.py \"Your question here\"")
    else:
        question = " ".join(sys.argv[1:])
        print(f"\n[*] Question: {question}")
        print("[*] Thinking...\n")
        answer = ask_question(question)
        print(f"[+] Answer:\n{answer}")
