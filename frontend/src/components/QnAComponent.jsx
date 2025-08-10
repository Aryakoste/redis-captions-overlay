import React, { useState } from 'react';
import { askQuestion, voteOnAnswer } from '../api';

const QnAComponent = () => {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [votingStates, setVotingStates] = useState({});

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const response = await askQuestion(question, context, true);
      
      const newEntry = {
        question,
        answer: response.answer,
        timestamp: new Date().toLocaleTimeString(),
        context: context || 'No context provided',
        source: response.source || 'unknown',
        confidence: response.confidence || 0.7,
        qa_id: response.qa_id
      };
      
      setHistory(prev => [newEntry, ...prev.slice(0, 4)]); // Keep last 5 entries
      setAnswer(response.answer);
      setCurrentResult(response);
      setQuestion('');
    } catch (error) {
      setAnswer('Error: Could not get answer. Please try again.');
      setCurrentResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (qaId, helpful) => {
    if (votingStates[qaId]) return; // Prevent multiple votes
    
    setVotingStates(prev => ({ ...prev, [qaId]: true }));
    
    try {
      await voteOnAnswer(qaId, helpful);
      // Update the history item to show it's been voted on
      setHistory(prev => prev.map(item => 
        item.qa_id === qaId 
          ? { ...item, hasVoted: true, voteType: helpful ? 'helpful' : 'not_helpful' }
          : item
      ));
    } catch (error) {
      console.error('Voting failed:', error);
    } finally {
      setVotingStates(prev => ({ ...prev, [qaId]: false }));
    }
  };

  const useSampleQuestions = () => {
    const samples = [
      "What is Redis and how does it work?",
      "How does real-time streaming benefit accessibility?",
      "What are the advantages of AI-powered captions?",
      "Explain WebSocket technology for live events",
      "How does semantic caching improve performance?"
    ];
    const randomQuestion = samples[Math.floor(Math.random() * samples.length)];
    setQuestion(randomQuestion);
  };

  return (
    <div className="qna-component">
      <h3>AI Q&A Assistant</h3>
      
      <form onSubmit={handleSubmitQuestion} className="qna-form">
        <div className="input-group">
          <label htmlFor="context">Context (Optional):</label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Provide context for better answers (e.g., transcript, event details)"
            rows={2}
          />
        </div>

        <div className="input-group">
          <label htmlFor="question">Question:</label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
          />
        </div>

        <div className="button-group">
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? '🤔 Thinking...' : '❓ Ask Question'}
          </button>
          <button type="button" onClick={useSampleQuestions}>
            🎲 Use Sample
          </button>
        </div>
      </form>

      {answer && (
        <div className="current-answer">
          <h4>Latest Answer:</h4>
          <div className="answer-box">
            {answer}
            {currentResult && (
              <div className="answer-metadata">
                <small>
                  Source: {currentResult.source} | 
                  Confidence: {Math.round((currentResult.confidence || 0.7) * 100)}%
                  {currentResult.qa_id && (
                    <span className="vote-section">
                      {' | '}
                      <button 
                        onClick={() => handleVote(currentResult.qa_id, true)}
                        disabled={votingStates[currentResult.qa_id]}
                        className="vote-btn helpful"
                      >
                        👍 Helpful
                      </button>
                      <button 
                        onClick={() => handleVote(currentResult.qa_id, false)}
                        disabled={votingStates[currentResult.qa_id]}
                        className="vote-btn not-helpful"
                      >
                        👎 Not Helpful
                      </button>
                    </span>
                  )}
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="qna-history">
          <h4>Recent Q&A History:</h4>
          {history.map((entry, index) => (
            <div key={index} className="history-item">
              <div className="history-time">[{entry.timestamp}]</div>
              <div className="history-question"><strong>Q:</strong> {entry.question}</div>
              <div className="history-answer"><strong>A:</strong> {entry.answer}</div>
              <div className="history-metadata">
                <small>
                  Source: {entry.source} | Confidence: {Math.round(entry.confidence * 100)}%
                  {entry.qa_id && !entry.hasVoted && (
                    <span className="vote-section">
                      {' | '}
                      <button 
                        onClick={() => handleVote(entry.qa_id, true)}
                        disabled={votingStates[entry.qa_id]}
                        className="vote-btn helpful small"
                      >
                        👍
                      </button>
                      <button 
                        onClick={() => handleVote(entry.qa_id, false)}
                        disabled={votingStates[entry.qa_id]}
                        className="vote-btn not-helpful small"
                      >
                        👎
                      </button>
                    </span>
                  )}
                  {entry.hasVoted && (
                    <span className="voted-indicator">
                      {' | '}✅ Voted ({entry.voteType === 'helpful' ? 'Helpful' : 'Not Helpful'})
                    </span>
                  )}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QnAComponent;
