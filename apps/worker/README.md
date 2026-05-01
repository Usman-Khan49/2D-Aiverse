# Voice to Text with Speaker Diarization

This project uses **WhisperX** to transcribe audio files and **Pyannote** to identify different speakers (Diarization).

## Prerequisites

1. **Python 3.10+**
2. **FFmpeg**: Must be installed and added to your system PATH.
   - [Download FFmpeg](https://ffmpeg.org/download.html)
3. **Hugging Face Account**:
   - Create an [Access Token](https://huggingface.co/settings/tokens) (Read permission).
   - Accept the user conditions for the following models:
     - [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
     - [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)

## Installation

```bash
pip install whisperx python-dotenv torch torchvision torchaudio
```

## Setup

1. Rename `.env.example` to `.env`.
2. Paste your Hugging Face token in the `.env` file:
   ```env
   HF_TOKEN=your_token_here
   ```

## Usage

Place your audio file (e.g., `v1.mpeg`) in the root directory and run:

```bash
python transcribe.py
```

The script will:
- Transcribe the audio using Whisper (Large-v3).
- Align the text with precise timestamps.
- Identify speakers (SPEAKER_00, SPEAKER_01, etc.).
- Map IDs to labels like `A1`, `A2`.
- Save the results to `transcript_output.json`.

## Customization

You can modify the `speaker_labels` dictionary in `transcribe.py` to map speaker IDs to real names:

```python
speaker_labels = {
    "SPEAKER_00": "Hammad",
    "SPEAKER_01": "Alice"
}
```
