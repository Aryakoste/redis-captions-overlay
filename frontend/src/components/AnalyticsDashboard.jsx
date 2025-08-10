import React, { useEffect, useState } from 'react';
import { getAnalytics } from '../api';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading analytics...</div>;

  return (
    <div className="analytics-dashboard">
      <h3>📊 Real-Time Analytics</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-number">{analytics?.captions_today || 0}</div>
          <div className="analytics-label">Captions Today</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-number">{analytics?.active_sessions || 0}</div>
          <div className="analytics-label">Active Sessions</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-number">{analytics?.top_qas?.length || 0}</div>
          <div className="analytics-label">Top Q&As</div>
        </div>
      </div>

      {analytics?.top_qas && analytics.top_qas.length > 0 && (
        <div className="top-qas">
          <h4>🏆 Most Helpful Q&As</h4>
          <div className="qas-list">
            {analytics.top_qas.map((qa, index) => (
              <div key={index} className="qa-leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="qa-id">{qa.value}</span>
                <span className="votes">{qa.score} votes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analytics-info">
        <p><small>📈 Updates automatically every 10 seconds</small></p>
        <p><small>🕒 Last updated: {new Date().toLocaleTimeString()}</small></p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
