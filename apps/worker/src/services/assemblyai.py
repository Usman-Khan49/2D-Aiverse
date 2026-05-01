import os
import assemblyai as aai
from dotenv import load_dotenv

load_dotenv()

class AssemblyAIService:
    def __init__(self):
        api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not api_key or api_key == "your_assemblyai_api_key_here":
            raise ValueError("ASSEMBLYAI_API_KEY not found in .env file.")
        aai.settings.api_key = api_key

    def transcribe_file(self, audio_file_path):
        """
        Transcribes an audio file with speaker diarization.
        """
        config = aai.TranscriptionConfig(
            speaker_labels=True,
            speech_models=["universal-3-pro", "universal-2"]
        )
        transcriber = aai.Transcriber()
        
        print(f"[*] Uploading and processing {audio_file_path}...")
        transcript = transcriber.transcribe(audio_file_path, config=config)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(f"Transcription failed: {transcript.error}")
            
        return self._format_output(transcript)

    def _format_output(self, transcript):
        """
        Formats the AssemblyAI transcript into our standard structure.
        """
        output = []
        if not getattr(transcript, 'utterances', None):
            return output

        for utterance in transcript.utterances:
            output.append({
                "speaker": f"Speaker {utterance.speaker}",
                "start": utterance.start / 1000, # Convert to seconds
                "end": utterance.end / 1000,
                "text": utterance.text
            })
        return output
