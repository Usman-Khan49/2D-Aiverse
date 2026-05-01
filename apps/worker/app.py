import os
from flask import Flask, request, jsonify, send_from_directory
from qna import ask_question
from transcribe import transcribe_with_diarization, format_output
from dotenv import load_dotenv
import json
import torch

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(file_path)
        
        try:
            # Run transcription
            raw_result = transcribe_with_diarization(file_path)
            formatted_result = format_output(raw_result)
            
            # Save result
            with open("transcript_output.json", "w") as f:
                json.dump(formatted_result, f, indent=4)
            
            return jsonify({"success": True, "message": "Transcription completed!"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    question = data.get('question')
    if not question:
        return jsonify({"error": "No question provided"}), 400
    
    # Check if API key exists
    if not os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_API_KEY") == "your_gemini_api_key_here":
        return jsonify({"answer": "Please set your GOOGLE_API_KEY in the .env file to enable Q&A!"})

    answer = ask_question(question)
    return jsonify({"answer": answer})

if __name__ == '__main__':
    print("\n[!] RoomMind Server starting...")
    print("[!] Access the dashboard at: http://127.0.0.1:5000")
    app.run(debug=True, port=5000, threaded=True)
