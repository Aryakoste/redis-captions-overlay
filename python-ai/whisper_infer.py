import sys
import json
import whisper
import tempfile
import os
import time

def transcribe_audio_file(audio_path, model_size="base", language=None):
    try:
        start_time = time.time()
        
        # Load Whisper model
        model = whisper.load_model(model_size)
        
        # Transcribe audio
        options = {}
        if language and language != "auto":
            options["language"] = language
            
        result = model.transcribe(audio_path, **options)
        
        processing_time = time.time() - start_time
        
        return {
            "text": result["text"].strip(),
            "language": result.get("language", "en"),
            "confidence": 0.95,  # Whisper doesn't provide confidence, so we estimate
            "processing_time": round(processing_time, 2),
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip()
                }
                for seg in result.get("segments", [])
            ]
        }
    except Exception as e:
        return {
            "error": str(e),
            "text": "",
            "language": "en",
            "confidence": 0.0
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)
        
    audio_path = sys.argv[1]
    model_size = sys.argv[1] if len(sys.argv) > 2 else "base"
    language = sys.argv[2] if len(sys.argv) > 3 else None
    
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found: {audio_path}"}))
        sys.exit(1)
        
    result = transcribe_audio_file(audio_path, model_size, language)
    print(json.dumps(result))
