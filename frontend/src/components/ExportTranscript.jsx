import React from 'react';

const ExportTranscript = ({ captions }) => {
  const downloadSRT = () => {
    if (captions.length === 0) {
      alert('No captions to export');
      return;
    }

    const srt = captions
      .map((caption, index) => {
        const start = new Date(caption.timestamp);
        const end = new Date(caption.timestamp + 3000); // 3 seconds duration
        
        const formatTime = (date) => {
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
          return `${hours}:${minutes}:${seconds},${milliseconds}`;
        };

        return `${index + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${caption.text}\n`;
      })
      .join('\n');

    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().split('T')[0]}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTXT = () => {
    if (captions.length === 0) {
      alert('No captions to export');
      return;
    }

    const txt = captions
      .map(caption => `[${new Date(caption.timestamp).toLocaleTimeString()}] ${caption.text}`)
      .join('\n');

    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-transcript">
      <h4>💾 Export Transcript</h4>
      <div className="export-buttons">
        <button onClick={downloadSRT} className="export-btn srt-btn">
          📄 Export as SRT
        </button>
        <button onClick={downloadTXT} className="export-btn txt-btn">
          📝 Export as TXT
        </button>
      </div>
      <p className="export-info">
        {captions.length} caption{captions.length !== 1 ? 's' : ''} ready for export
      </p>
    </div>
  );
};

export default ExportTranscript;
