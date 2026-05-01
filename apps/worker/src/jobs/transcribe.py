from src.services.assemblyai import AssemblyAIService

def run_transcription_job(audio_file_path):
    """
    Job to transcribe an audio file and return the formatted transcript.
    """
    service = AssemblyAIService()
    try:
        transcript = service.transcribe_file(audio_file_path)
        return transcript
    except Exception as e:
        print(f"[!] Error in transcription job: {e}")
        raise e
