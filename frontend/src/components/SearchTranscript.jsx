import React, { useState } from 'react';

const SearchTranscript = ({ captions, onJump }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const matches = captions.filter(caption =>
      caption.text.toLowerCase().includes(query.toLowerCase())
    );
    setResults(matches);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div className="search-transcript">
      <h4>🔍 Search Transcript</h4>
      <div className="search-controls">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcript..."
          aria-label="Search transcript"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="search-btn">Search</button>
        <button onClick={clearSearch} className="clear-search-btn">Clear</button>
      </div>
      
      {results.length > 0 && (
        <div className="search-results">
          <h5>Results ({results.length})</h5>
          <ul className="results-list">
            {results.map((result) => (
              <li key={result.id} className="search-result-item">
                <button 
                  onClick={() => onJump(result.timestamp)}
                  className="jump-to-btn"
                >
                  <span className="result-time">[{new Date(result.timestamp).toLocaleTimeString()}]</span>
                  <span className="result-text">
                    {result.text.length > 60 ? `${result.text.slice(0, 60)}...` : result.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {query && results.length === 0 && (
        <p className="no-results">No results found for "{query}"</p>
      )}
    </div>
  );
};

export default SearchTranscript;
