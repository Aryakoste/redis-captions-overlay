import React, { useState } from 'react';
import axios from 'axios';

const AudioRecorder = ({ sessionId = 'audio_session' }) => {
  const [recognizing, setRecognizing] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const startRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;

    rec.onstart = () => {
      console.log('🎤 Recognition started');
      setRecognizing(true);
    };

    rec.onerror = (event) => console.error('Speech recognition error:', event);
    rec.onend = () => {
      console.log('🛑 Recognition ended');
      setRecognizing(false);
    };

    rec.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
          // Send final recognized text to backend
          sendToBackend(transcript.trim(), event.results[i][0].confidence || 0.9);
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);
      setFinalTranscript(prev => prev + finalText);
    };

    rec.start();
    setRecognition(rec);
  };

  const stopRecognition = () => {
    if (recognition) recognition.stop();
  };

  const sendToBackend = (text, confidence) => {
    if (!text) return;
    axios.post('http://localhost:8000/caption', {
      text,
      sessionId,
      lang: 'en',
      confidence
    })
    .then(res => {
      console.log('✅ Sent caption to backend:', res.data);
    })
    .catch(err => {
      console.error('❌ Failed to send caption:', err);
    });
  };

  return (
    <div className="audio-recorder">
      <h3>🎤 Live Speech Recognition (Web Speech API)</h3>
      <p><strong>Session:</strong> {sessionId}</p>

      <div className="control-buttons">
        {!recognizing ? (
          <button onClick={startRecognition} className="start-btn">
            ▶️ Start Recognition
          </button>
        ) : (
          <button onClick={stopRecognition} className="stop-btn">
            ⏹ Stop Recognition
          </button>
        )}
      </div>

      <div className="transcript-display">
        <p><strong>Final Transcript:</strong> {finalTranscript}</p>
        {interimTranscript && (
          <p style={{ opacity: 0.6 }}>
            <em>Interim: {interimTranscript}</em>
          </p>
        )}
      </div>

      <div className="recorder-info">
        <h4>ℹ️ How it works:</h4>
        <ul>
          <li>🎙️ Uses browser’s Web Speech API for speech-to-text</li>
          <li>📤 Sends final recognized text to backend as captions</li>
          <li>📱 Updates Live Captions & Transcript tabs instantly</li>
          <li>🌍 Supported in most Chromium-based browsers</li>
          <li>💡 No server-side audio transcription required</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioRecorder;
