import json

def generate_mock_data():
    mock_data = [
        {"speaker": "Hammad", "start": "0.00", "end": "3.50", "text": "Welcome to the first meeting of RoomMind. We're going to discuss our development roadmap."},
        {"speaker": "Alice", "start": "4.20", "end": "7.80", "text": "Thanks Hammad. I've been looking into the WhisperX integration for our voice-to-text service."},
        {"speaker": "Hammad", "start": "8.10", "end": "12.40", "text": "Great. Does it handle the diarization well? We need to know exactly who is talking at each moment."},
        {"speaker": "Alice", "start": "13.00", "end": "18.50", "text": "Yes, with the Pyannote pipeline, we can get speaker labels like SPEAKER_00 and map them to our internal IDs."},
        {"speaker": "Bob", "start": "19.20", "end": "22.10", "text": "Will it work in real-time? Or is it post-processing only?"}
    ]
    
    with open("transcript_output.json", "w") as f:
        json.dump(mock_data, f, indent=4)
    print("[+] Mock transcript generated: transcript_output.json")

if __name__ == "__main__":
    generate_mock_data()
