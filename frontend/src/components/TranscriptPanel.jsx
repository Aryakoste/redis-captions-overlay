import React, { useEffect, useRef } from 'react';

const TranscriptPanel = ({ captions }) => {
  const panelRef = useRef();

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [captions]);

  return (
    <div className="transcript-panel-container">
      <h3>📜 Live Transcript</h3>
      <aside
        className="transcript-panel"
        role="log"
        aria-live="polite"
        tabIndex="0"
        ref={panelRef}
      >
        {captions.length === 0 ? (
          <p className="no-transcript">No transcript entries yet. Captions will appear here as they are received.</p>
        ) : (
          captions.map((caption) => (
            <p key={caption.id} data-ts={caption.timestamp} className="transcript-entry">
              <span className="transcript-time">[{new Date(caption.timestamp).toLocaleTimeString()}]</span>
              <span className="transcript-text">{caption.text}</span>
              {caption.confidence && (
                <span className="transcript-confidence">({Math.round(caption.confidence * 100)}%)</span>
              )}
            </p>
          ))
        )}
      </aside>
    </div>
  );
};

export default TranscriptPanel;
