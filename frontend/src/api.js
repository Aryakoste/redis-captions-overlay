import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendCaption = async (text, lang = 'en', sessionId = 'default', confidence = 0.95) => {
  try {
    const response = await api.post('/caption', { text, lang, sessionId, confidence });
    return response.data;
  } catch (error) {
    console.error('Error sending caption:', error);
    throw error;
  }
};

export const askQuestion = async (question, context = '', useKnowledgeBase = true) => {
  try {
    const response = await api.post('/qna', { question, context, useKnowledgeBase });
    return response.data;
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
};

export const uploadAudioFile = async (audioFile, sessionId = 'default') => {
  try {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('sessionId', sessionId);
    const response = await api.post('/caption/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};

export const voteOnAnswer = async (qaId, helpful = true) => {
  try {
    const response = await api.post(`/qna/vote/${qaId}`, { helpful });
    return response.data;
  } catch (error) {
    console.error('Error voting:', error);
    throw error;
  }
};

export const getAnalytics = async () => {
  try {
    const response = await api.get('/analytics');
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

export const searchCaptions = async (query, lang, sessionId, limit = 10) => {
  try {
    const response = await api.get('/search/captions', {
      params: { q: query, lang, sessionId, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching captions:', error);
    throw error;
  }
};

export const searchKnowledge = async (query, category, limit = 5) => {
  try {
    const response = await api.get('/search/knowledge', {
      params: { q: query, category, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching knowledge:', error);
    throw error;
  }
};

export const translateText = async (text, targetLang = 'es') => {
  try {
    const response = await api.post('/translate', { text, targetLang });
    return response.data;
  } catch (error) {
    console.error('Error translating:', error);
    throw error;
  }
};
