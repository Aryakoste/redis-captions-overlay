import React, { useState, useRef } from 'react';
import { sendCaption } from '../api';

const FileUploader = ({ sessionId = 'audio_upload' }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript('');
    setTranscriptionStatus('');
    setUploadStatus('');
  };

  const handleTranscribe = () => {
    setTranscript('');
    setTranscriptionStatus('Starting browser transcription…');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionStatus('❌ Web Speech API not supported in this browser.');
      return;
    }
    if (!selectedFile || !audioUrl) {
      setTranscriptionStatus('❌ No audio selected for transcription.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    let fullText = '';

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          fullText += event.results[i][0].transcript + ' ';
        }
      }
      setTranscript(fullText.trim());
    };
    rec.onerror = e => {
      setTranscriptionStatus(`❌ Speech recognition error: ${e.error}`);
      setTranscribing(false);
    };
    rec.onend = () => {
      setTranscriptionStatus('📝 Transcription finished.');
      setTranscribing(false);
    };

    recognitionRef.current = rec;
    setTranscribing(true);
    setTranscriptionStatus('▶️ Playback started, transcribing...');
    rec.start();
    audioRef.current.currentTime = 0;
    audioRef.current.play();

    audioRef.current.onended = () => {
      if (rec && rec.stop) rec.stop();
    };
  };

  const handleSend = async () => {
    if (!transcript.trim()) {
      setUploadStatus('❌ No transcript to send.');
      return;
    }
    setUploadStatus('Sending caption...');
    try {
      await sendCaption(transcript, sessionId, 'en', 0.95);
      setUploadStatus('✅ Caption sent!');
      setSelectedFile(null);
      setAudioUrl('');
      setTranscript('');
      setTranscriptionStatus('');
      document.getElementById('audio-upload').value = '';
    } catch (err) {
      setUploadStatus('❌ Failed to send caption.');
    }
  };

  // Stop recognition if user closes/transcribes a different file
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  return (
    <div className="file-uploader">
      <h3>Audio File Transcription (Browser Only)</h3>
      <p>Upload an audio file, let your browser transcribe it, then send the text as a caption.</p>
      <input
        id="audio-upload"
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="file-input"
      />
      {selectedFile && (
        <div className="file-info">
          <div>
            <strong>Selected:</strong> {selectedFile.name} &nbsp;
            <em>({(selectedFile.size/1024/1024).toFixed(2)} MB)</em>
          </div>

          {audioUrl && (
            <div style={{margin: '1em 0'}}>
              <audio
                controls
                ref={audioRef}
                src={audioUrl}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <button
            onClick={handleTranscribe}
            disabled={transcribing}
            className="upload-btn"
            style={{marginBottom: 8}}
          >
            {transcribing ? "⏳ Transcribing…" : "🎤 Transcribe with Web Speech API"}
          </button>
          {transcriptionStatus && (
            <div className="upload-status info">{transcriptionStatus}</div>
          )}

          <label>
            <div>Edit/Review Transcript Below:</div>
            <textarea
              rows={4}
              style={{ width: '100%', marginTop: 8 }}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              disabled={transcribing}
              placeholder="Transcript will appear here"
            />
          </label>
          <button
            onClick={handleSend}
            disabled={transcribing || !transcript.trim()}
            className="upload-btn"
            style={{marginTop: 8}}
          >
            🚀 Send as Caption
          </button>
          {uploadStatus && (
            <div className={`upload-status ${uploadStatus.includes('✅') ? 'success' : uploadStatus.includes('❌') ? 'error' : 'info'}`}>
              {uploadStatus}
            </div>
          )}
        </div>
      )}
      {!selectedFile && (
        <div className="upload-tips">
          <h4>💡 Tips:</h4>
          <ul>
            <li>Supported: MP3, WAV, M4A, OGG (browser must be able to play the file)</li>
            <li>Transcription runs in-browser: Chrome/Edge recommended</li>
            <li>Review or edit the transcript before sending it as a caption</li>
            <li>No file is sent to the server, only the transcribed text is</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
