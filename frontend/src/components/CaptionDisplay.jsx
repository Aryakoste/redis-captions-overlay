import React, { useEffect, useState } from 'react';
import { translateText } from '../api';

const API_BASE_URL = import.meta.env.API_BASE_URL;

const CaptionDisplay = ({ sessionId, onNewCaption, style }) => {
  const [captions, setCaptions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [ws, setWs] = useState(null);
  const [translating, setTranslating] = useState({});

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      console.log('🔗 Connecting to WebSocket...');
      const websocket = new WebSocket('wss://redis-captions-overlay.onrender.com');
      setWs(websocket);

      websocket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('Connected');
        websocket.send(JSON.stringify({ type: 'ping' }));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          
          switch (message.type) {
            case 'connection_status':
              console.log('Connection status:', message.data);
              break;
            case 'new_caption':
              addCaptionToDisplay(message.data);
              break;
            case 'pong':
              console.log('🏓 Pong received');
              break;
            default:
              if (message.text) {
                addCaptionToDisplay(message);
              }
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('Disconnected');
        
        setTimeout(() => {
          if (connectionStatus !== 'Connected') {
            console.log('🔄 Attempting to reconnect...');
            connectWebSocket();
          }
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('Error');
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('Error');
    }
  };

  const addCaptionToDisplay = (captionData) => {
    const processedCaption = {
      ...captionData,
      timestamp: captionData.timestamp ? 
        captionData.timestamp : 
        Date.now(),
      id: captionData.id || Date.now() + Math.random()
    };
    
    console.log('➕ Adding caption to display:', processedCaption);
    setCaptions(prev => {
      if (prev.some(c => c.id === processedCaption.id)) return prev;
     return [...prev.slice(-9), processedCaption]
    });
    
    // Feed to transcript tab
    if (onNewCaption) {
      onNewCaption(processedCaption);
    }
  };

  const clearCaptions = () => {
    setCaptions([]);
    console.log('🧹 Captions cleared');
  };

  const handleTranslate = async (caption, targetLang = 'es') => {
    setTranslating(prev => ({ ...prev, [caption.id]: true }));
    
    try {
      console.log('🌐 Translating caption to:', targetLang);
      const result = await translateText(caption.text, targetLang);
      
      const translatedCaption = {
        ...caption,
        text: result.translated,
        lang: targetLang,
        timestamp: Date.now(),
        id: Date.now() + Math.random(),
        isTranslation: true,
        originalText: caption.text
      };
      
      setCaptions(prev => {
      if (prev.some(c => c.id === translatedCaption.id)) return prev;
     return [...prev.slice(-9), translatedCaption]
    });
      if (onNewCaption) {
        onNewCaption(translatedCaption);
      }
    } catch (error) {
      console.error('❌ Translation failed:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setTranslating(prev => ({ ...prev, [caption.id]: false }));
    }
  };

  return (
    <div className="caption-display" style={style}>
      <div className="caption-header">
        <h3>Live Captions</h3>
        <div className="connection-status">
          Status: <span className={connectionStatus.toLowerCase()}>{connectionStatus}</span>
          <button onClick={clearCaptions} className="clear-btn">Clear</button>
          {connectionStatus !== 'Connected' && (
            <button onClick={connectWebSocket} className="reconnect-btn">Reconnect</button>
          )}
        </div>
      </div>
      <div className="caption-container">
        {captions.length === 0 ? (
          <div className="no-captions">
            <p>No captions yet. Send some captions or start recording!</p>
            <p><small>WebSocket Status: {connectionStatus}</small></p>
          </div>
        ) : (
          captions.map((caption) => (
            <div key={caption.id} className={`caption-item ${caption.isTranslation ? 'translation' : ''}`}>
              <div className="caption-content">
                <span className="caption-time">[{new Date(caption.timestamp).toLocaleTimeString()}]</span>
                <span className="caption-text">{caption.text}</span>
                {caption.lang && <span className="caption-lang">({caption.lang})</span>}
                {caption.confidence && (
                  <span className="caption-confidence">Conf: {Math.round(caption.confidence * 100)}%</span>
                )}
                {caption.session_id && caption.session_id !== 'default' && (
                  <span className="caption-session">Session: {caption.session_id}</span>
                )}
                {caption.source && (
                  <span className="caption-source">Source: {caption.source}</span>
                )}
                {caption.isTranslation && (
                  <span className="translation-badge">Translated</span>
                )}
              </div>
              <div className="caption-actions">
                <button 
                  onClick={() => handleTranslate(caption, 'es')} 
                  disabled={translating[caption.id]}
                  className="translate-btn"
                  title="Translate to Spanish"
                >
                  {translating[caption.id] ? '⏳' : '🇪🇸'}
                </button>
                <button 
                  onClick={() => handleTranslate(caption, 'fr')} 
                  disabled={translating[caption.id]}
                  className="translate-btn"
                  title="Translate to French"
                >
                  {translating[caption.id] ? '⏳' : '🇫🇷'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaptionDisplay;
