from src.services.gemini import GeminiService
import json

def run_chunk_summarization_job(transcript_text):
    """
    Summarizes a chunk of transcript segments.
    Expects transcript_text as a formatted string.
    """
    service = GeminiService()
    
    try:
        # GeminiService.summarize_chunk already cleans the response and returns a DICT
        summary_dict = service.summarize_chunk(transcript_text)
        return summary_dict
    except Exception as e:
        print(f"[!] Error in chunk summarization job: {e}")
        raise e

def run_final_synthesis_job(chunk_summaries):
    """
    Synthesizes multiple chunk summaries into the final session summary.
    """
    service = GeminiService()
    
    try:
        # GeminiService already handles the cleaning and returns a DICT
        final_summary_dict = service.synthesize_summaries(chunk_summaries)
        return final_summary_dict
    except Exception as e:
        print(f"[!] Error in final synthesis job: {e}")
        raise e
