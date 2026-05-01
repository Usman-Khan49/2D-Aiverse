import os
import json
import traceback
from dotenv import load_dotenv
import assemblyai as aai

load_dotenv()

def transcribe_with_diarization(audio_file, *args, **kwargs):
    """
    Transcribes audio and performs speaker diarization using AssemblyAI API.
    """
    print("[*] Starting transcription with AssemblyAI...")
    
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key or api_key == "your_assemblyai_api_key_here":
        raise ValueError("ASSEMBLYAI_API_KEY not found in .env file. Please add your key.")

    aai.settings.api_key = api_key

    config = aai.TranscriptionConfig(
        speaker_labels=True,
        speech_models=["universal-3-pro", "universal-2"]
    )
    transcriber = aai.Transcriber()
    
    print("[*] Uploading and processing audio...")
    transcript = transcriber.transcribe(audio_file, config=config)

    if transcript.status == aai.TranscriptStatus.error:
        print(f"[!] Transcription failed: {transcript.error}")
        raise Exception(f"Transcription failed: {transcript.error}")
        
    print("[+] Transcription and Diarization completed.")
    return transcript

def format_output(transcript, *args, **kwargs):
    """
    Formats the AssemblyAI transcript into the required structure.
    """
    output = []
    
    if not getattr(transcript, 'utterances', None):
        print("[!] No utterances found. Speaker labels might have failed.")
        return output

    for utterance in transcript.utterances:
        output.append({
            "speaker": f"Speaker {utterance.speaker}", # e.g., A, B, C
            "start": f"{utterance.start / 1000:.2f}", # AssemblyAI returns ms
            "end": f"{utterance.end / 1000:.2f}",
            "text": utterance.text
        })
    return output

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Transcribe audio with speaker diarization using AssemblyAI.")
    parser.add_argument("audio", nargs="?", default="v1.mpeg", help="Path to the audio file.")
    args = parser.parse_args()

    AUDIO_FILE = args.audio

    if not os.path.exists(AUDIO_FILE):
        print(f"[!] ERROR: Audio file {AUDIO_FILE} not found.")
        exit(1)

    try:
        raw_result = transcribe_with_diarization(AUDIO_FILE)
        formatted_result = format_output(raw_result)

        # Print to console
        print("\n--- TRANSCRIPT ---\n")
        detected_speakers = set()
        for line in formatted_result:
            print(f"[{line['start']}s - {line['end']}s] {line['speaker']}: {line['text']}")
            detected_speakers.add(line['speaker'])

        print(f"\n[+] Detected {len(detected_speakers)} speakers: {', '.join(sorted(list(detected_speakers)))}")

        # Save to JSON
        with open("transcript_output.json", "w") as f:
            json.dump(formatted_result, f, indent=4)
            print(f"[+] Full transcript saved to transcript_output.json")

    except Exception as e:
        print(f"[!] An error occurred: {e}")
        print("\n--- DEBUG INFO (Traceback) ---")
        traceback.print_exc()
