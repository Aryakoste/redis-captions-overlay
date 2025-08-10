import React, { useState } from 'react';
import { sendCaption } from '../api';

const TestCaption = ({ sessionId = 'test_session' }) => {
  const [captionText, setCaptionText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendCaption = async () => {
    if (!captionText.trim()) {
      alert('Please enter some caption text');
      return;
    }

    setIsSending(true);
    try {
      console.log('📝 Sending test caption:', captionText);
      const result = await sendCaption(captionText, sessionId, 'en', 0.95);
      console.log('✅ Caption sent successfully:', result.data);
      setCaptionText('');
    } catch (error) {
      console.error('❌ Failed to send caption:', error);
      alert('Failed to send caption. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const sendPredefinedCaption = async (text) => {
    setIsSending(true);
    try {
      await sendCaption(text, sessionId, 'en', 0.95);
      console.log('✅ Predefined caption sent:', text);
    } catch (error) {
      console.error('❌ Failed to send predefined caption:', error);
      alert('Failed to send caption. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const predefinedCaptions = [
    "Welcome to our AI-powered accessibility demo!",
    "This system provides real-time captions using Redis and AI.",
    "Live transcription is now available for all participants.",
    "Questions can be asked and answered using our Q&A system.",
    "Thank you for joining our accessibility showcase."
  ];

  return (
    <div className="test-caption">
      <h3>📝 Send Test Caption</h3>
      
      <div className="manual-caption">
        <textarea
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          placeholder="Type your caption here..."
          rows={3}
          disabled={isSending}
        />
        <button 
          onClick={handleSendCaption}
          disabled={isSending || !captionText.trim()}
          className="send-caption-btn"
        >
          {isSending ? '⏳ Sending...' : '📤 Send Caption'}
        </button>
      </div>

      <div className="predefined-captions">
        <h4>Quick Test Captions:</h4>
        <div className="predefined-buttons">
          {predefinedCaptions.map((caption, index) => (
            <button
              key={index}
              onClick={() => sendPredefinedCaption(caption)}
              disabled={isSending}
              className="predefined-caption-btn"
            >
              {caption.substring(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      <div className="test-info">
        <p><strong>Session ID:</strong> {sessionId}</p>
        <p><small>Captions will appear in both Live Captions and Transcript tabs</small></p>
      </div>
    </div>
  );
};

export default TestCaption;
