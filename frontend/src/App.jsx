import React, { useState } from 'react';
import CaptionDisplay from './components/CaptionDisplay';
import AudioRecorder from './components/AudioRecorder';
import QnAComponent from './components/QnAComponent';
import FileUploader from './components/FileUploader';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SearchComponent from './components/SearchComponent';
import { sendCaption } from './api';
import './App.css';
import TranscriptPanel from './components/TranscriptPanel';
import SearchTranscript from './components/SearchTranscript';
import ExportTranscript from './components/ExportTranscript';

function App() {
  const [manualCaption, setManualCaption] = useState('');
  const [activeTab, setActiveTab] = useState('captions');
  const [sessionId, setSessionId] = useState('demo_session');
  const [captions, setCaptions] = useState([]);

  const handleSendManualCaption = async (e) => {
    e.preventDefault();
    if (!manualCaption.trim()) return;

    try {
      await sendCaption(manualCaption, 'en', sessionId);
      setManualCaption('');
    } catch (error) {
      alert('Failed to send caption. Please try again.');
    }
  };

  const handleNewCaption = (cap) => {
    setCaptions((prev) => {
      if (prev.some(c => c.id === cap.id)) return prev;
      return  [...prev.slice(-99), cap]
    });
  };

  const jumpToTimestamp = (ts) => {
    const el = document.querySelector(`[data-ts="${ts}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      el.focus();
    }
  };

  const sendTestCaption = async () => {
    const testCaptions = [
      "Welcome to the AI-Enhanced Accessibility Overlay demo!",
      "This system provides real-time captions for live events.",
      "You can ask questions and get AI-powered answers.",
      "Redis powers the real-time streaming capabilities.",
      "This demo showcases inclusive technology for everyone.",
      "Vector search and semantic caching optimize performance.",
      "Multi-language support makes events globally accessible."
    ];
    
    const randomCaption = testCaptions[Math.floor(Math.random() * testCaptions.length)];
    await sendCaption(randomCaption, 'en', sessionId, Math.random() * 0.3 + 0.7);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎭 AI-Enhanced Accessibility Overlay</h1>
        <p>Real-time captions, Q&A, search, and accessibility features powered by Redis</p>
        <div className="session-control">
          <label>
            Session ID: 
            <input 
              type="text" 
              value={sessionId} 
              onChange={(e) => setSessionId(e.target.value)}
              className="session-input"
            />
          </label>
        </div>
      </header>

      <nav className="tab-navigation">
        <button 
          className={activeTab === 'captions' ? 'active' : ''}
          onClick={() => setActiveTab('captions')}
        >
          📺 Live Captions
        </button>
        <button 
          className={activeTab === 'recording' ? 'active' : ''}
          onClick={() => setActiveTab('recording')}
        >
          🎤 Audio Recorder
        </button>
        <button 
          className={activeTab === 'transcript' ? 'active' : ''}
          onClick={() => setActiveTab('transcript')}
        >
          📺 Transcript
        </button>
        <button 
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          📁 File Upload
        </button>
        <button 
          className={activeTab === 'qna' ? 'active' : ''}
          onClick={() => setActiveTab('qna')}
        >
          🤖 AI Q&A
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button 
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'captions' && (
          <div className="tab-content">
            <div className="caption-controls">
              <form onSubmit={handleSendManualCaption} className="manual-caption-form">
                <input
                  type="text"
                  value={manualCaption}
                  onChange={(e) => setManualCaption(e.target.value)}
                  placeholder="Type a caption to send..."
                  className="caption-input"
                />
                <button type="submit" disabled={!manualCaption.trim()}>
                  📤 Send Caption
                </button>
              </form>
              
              <button onClick={sendTestCaption} className="test-btn">
                🎯 Send Test Caption
              </button>
            </div>
            
          </div>
        )}
         <CaptionDisplay
          sessionId={sessionId}
          onNewCaption={handleNewCaption}
          style={{ display: activeTab === 'captions' ? 'block' : 'none' }}
        />

        {activeTab === 'recording' && (
          <div className="tab-content">
            <AudioRecorder sessionId={sessionId} />
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="transcript-tab">
            <div className="transcript-layout">
              <div className="transcript-main">
                <TranscriptPanel captions={captions} />
              </div>
              <div className="transcript-sidebar">
                <SearchTranscript captions={captions} onJump={jumpToTimestamp} />
                <ExportTranscript captions={captions} />
              </div>
            </div>
          </div>
        )}
  

        {activeTab === 'upload' && (
          <div className="tab-content">
            <FileUploader sessionId={sessionId} />
          </div>
        )}

        {activeTab === 'qna' && (
          <div className="tab-content">
            <QnAComponent />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="tab-content">
            <AnalyticsDashboard />
          </div>
        )}

        {activeTab === 'search' && (
          <div className="tab-content">
            <SearchComponent />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>🚀 Built with React, Node.js, Redis Stack, and open-source AI models</p>
        <p>💡 Showcasing Redis beyond caching: Streams, Search, Pub/Sub, Analytics</p>
      </footer>
    </div>
  );
}

export default App;
