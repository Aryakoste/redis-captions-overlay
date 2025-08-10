import React, { useState, useEffect } from 'react';
import { searchCaptions, searchKnowledge } from '../api';

const SearchComponent = () => {
  const [searchType, setSearchType] = useState('captions');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [filters, setFilters] = useState({
    lang: '',
    sessionId: '',
    category: ''
  });

  // Load debug info on component mount
  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/debug/search');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log(`🔍 Searching ${searchType} for:`, query);
      
      let data;
      if (searchType === 'captions') {
        data = await searchCaptions(query, filters.lang, filters.sessionId);
      } else {
        data = await searchKnowledge(query, filters.category);
      }
      
      console.log('📊 Search results:', data);
      setResults(data.results || []);
      
      if (data.results && data.results.length === 0) {
        setError(`No results found for "${query}". Try different keywords or check filters.`);
      }
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      setError(`Search failed: ${error.response?.data?.error || error.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    setFilters({ lang: '', sessionId: '', category: '' });
  };

  const runTestSearch = () => {
    const testQueries = searchType === 'captions' 
      ? ['Redis', 'demo', 'accessibility', 'real-time', 'AI']
      : ['Redis', 'streaming', 'accessibility', 'technology'];
    
    const randomQuery = testQueries[Math.floor(Math.random() * testQueries.length)];
    setQuery(randomQuery);
  };

  return (
    <div className="search-component">
      <h3>🔍 Search & Discovery</h3>
      
      {debugInfo && (
        <div className="debug-info">
          <h4>🐛 Search Status:</h4>
          <div className="debug-grid">
            <div className="debug-item">
              <strong>Captions in DB:</strong> {debugInfo.data_counts?.captions || 0}
            </div>
            <div className="debug-item">
              <strong>Q&A in DB:</strong> {debugInfo.data_counts?.qa_entries || 0}
            </div>
            <div className="debug-item">
              <strong>Caption Index:</strong> {debugInfo.indexes?.captions?.error ? '❌' : '✅'}
            </div>
            <div className="debug-item">
              <strong>Knowledge Index:</strong> {debugInfo.indexes?.knowledge?.error ? '❌' : '✅'}
            </div>
          </div>
        </div>
      )}
      
      <div className="search-controls">
        <div className="search-type-selector">
          <label>
            <input
              type="radio"
              value="captions"
              checked={searchType === 'captions'}
              onChange={(e) => setSearchType(e.target.value)}
            />
            Search Captions ({debugInfo?.data_counts?.captions || 0} available)
          </label>
          <label>
            <input
              type="radio"
              value="knowledge"
              checked={searchType === 'knowledge'}
              onChange={(e) => setSearchType(e.target.value)}
            />
            Search Knowledge Base ({debugInfo?.data_counts?.qa_entries || 0} available)
          </label>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${searchType}... (try: "Redis", "demo", "accessibility")`}
              className="search-input"
            />
            <button type="submit" disabled={loading || !query.trim()}>
              {loading ? '🔄' : '🔍'} Search
            </button>
          </div>

          <div className="search-filters">
            {searchType === 'captions' ? (
              <>
                <input
                  type="text"
                  placeholder="Language (e.g., en, es)"
                  value={filters.lang}
                  onChange={(e) => setFilters({...filters, lang: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Session ID"
                  value={filters.sessionId}
                  onChange={(e) => setFilters({...filters, sessionId: e.target.value})}
                />
              </>
            ) : (
              <input
                type="text"
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              />
            )}
          </div>

          <div className="search-actions">
            <button type="button" onClick={clearSearch} className="clear-search-btn">
              🧹 Clear
            </button>
            <button type="button" onClick={runTestSearch} className="test-search-btn">
              🎯 Try Sample
            </button>
            <button type="button" onClick={fetchDebugInfo} className="refresh-debug-btn">
              🔄 Refresh Status
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="search-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <h4>📊 Search Results ({results.length})</h4>
          <div className="results-list">
            {results.map((result, index) => (
              <div key={index} className="result-item">
                {searchType === 'captions' ? (
                  <div className="caption-result">
                    <div className="result-text">"{result.text}"</div>
                    <div className="result-metadata">
                      <span className="metadata-item">📅 {new Date(result.timestamp).toLocaleString()}</span>
                      <span className="metadata-item">🌍 {result.lang}</span>
                      <span className="metadata-item">📊 {Math.round(result.confidence * 100)}%</span>
                      <span className="metadata-item">🏷️ {result.session_id}</span>
                      <span className="metadata-item">📍 {result.source}</span>
                    </div>
                  </div>
                ) : (
                  <div className="knowledge-result">
                    <div className="result-question"><strong>❓ Q:</strong> {result.question}</div>
                    <div className="result-answer"><strong>💡 A:</strong> {result.answer}</div>
                    <div className="result-metadata">
                      <span className="metadata-item">🏷️ {result.category}</span>
                      <span className="metadata-item">👍 {result.votes} votes</span>
                      <span className="metadata-item">👁️ {result.views} views</span>
                      <span className="metadata-item">📅 {new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {query && results.length === 0 && !loading && !error && (
        <div className="no-results">
          <p>🔍 No results found for "<strong>{query}</strong>"</p>
          <p>💡 Try different keywords, check your filters, or add more captions to search.</p>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
