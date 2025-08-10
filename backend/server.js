import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import redis from './redis.js';
import { 
  addCaptionToStream, 
  readCaptionsFromStream,
  addQnAToKnowledgeBase,
  subscribeToPatterns,
  updateQnAVote 
} from './streaming.js';
import { 
  transcribeAudio, 
  answerQuestion, 
  translateText, 
  processLiveAudioChunk
} from './captions.js';

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `audio_${Date.now()}_${file.originalname}`);
  }
});

if (!fs.existsSync('./uploads/')) {
  fs.mkdirSync('./uploads/');
}

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'), false);
    }
  }
});

const server = http.createServer(app);

const wsConnections = new Set();

app.post('/caption', async (req, res) => {
  try {
    const { text, lang, sessionId, confidence } = req.body;
    console.log('📝 Received caption:', { text, lang, sessionId });
    
    const result = await addCaptionToStream(text, lang, { sessionId, confidence });
    
    const captionData = {
      text,
      lang: lang || 'en',
      timestamp: Date.now(),
      session_id: sessionId || 'default',
      confidence: confidence || 0.95,
      id: Date.now() + Math.random()
    };
    
    broadcastToClients(JSON.stringify({
      type: 'new_caption',
      data: captionData
    }));

    
    res.json({ status: "success", ...result, data: captionData });
  } catch (error) {
    console.error('Caption error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/caption/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('🎵 Processing uploaded audio file:', req.file.filename);
    console.log('📊 File info:', {
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname
    });

    const transcriptionResult = await transcribeAudio(req.file.path, {
      modelName: req.body.model || 'base.en',
      language: req.body.language || 'auto'
    });

    const result = await addCaptionToStream(
      transcriptionResult.text,
      transcriptionResult.language || 'en',
      {
        sessionId: req.body.sessionId || 'audio_upload',
        confidence: transcriptionResult.confidence || 0.9,
        source: 'nodejs-whisper',
        filename: req.file.originalname,
        processing_time: transcriptionResult.processing_time || 0,
        segments: transcriptionResult.segments || []
      }
    );

    const captionData = {
      text: transcriptionResult.text,
      lang: transcriptionResult.language || 'en',
      timestamp: Date.now(),
      session_id: req.body.sessionId || 'audio_upload',
      confidence: transcriptionResult.confidence || 0.9,
      source: 'nodejs-whisper',
      processing_time: transcriptionResult.processing_time || 0,
      segments_count: (transcriptionResult.segments || []).length,
      id: Date.now() + Math.random()
    };

    broadcastToClients(JSON.stringify({
      type: 'new_caption',
      data: captionData
    }));

    fs.unlinkSync(req.file.path);

    res.json({
      status: 'success',
      transcription: transcriptionResult.text,
      language: transcriptionResult.language,
      confidence: transcriptionResult.confidence,
      processing_time: transcriptionResult.processing_time,
      segments: transcriptionResult.segments
    });
  } catch (error) {
    console.error('🚨 Audio transcription error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: error.message,
      details: 'Audio transcription failed using nodejs-whisper.'
    });
  }
});
app.post('/caption/live-audio', async (req, res) => {
  try {
    const { audioData, sessionId } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const audioBuffer = Buffer.from(audioData, 'base64');

    const simulated = {
      text: `[Simulated Live] Audio chunk at ${new Date().toLocaleTimeString()}`,
      language: 'en',
      confidence: 0.75
    };

    const cap = await addCaptionToStream(
      simulated.text,
      simulated.language,
      { sessionId: sessionId || 'live_audio', confidence: simulated.confidence, source: 'live_sim' }
    );

    const captionData = {
      id: cap.captionId,
      text: simulated.text,
      lang: simulated.language,
      session_id: sessionId || 'live_audio',
      confidence: simulated.confidence,
      timestamp: Date.now(),
      source: 'live_sim'
    };

    broadcastToClients(JSON.stringify({ type: 'new_caption', data: captionData }));

    res.json({ status: 'success', data: captionData });
  } catch (error) {
    console.error('🚨 Live audio processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/qna', async (req, res) => {
  try {
    const { question, context, useKnowledgeBase = true } = req.body;
    console.log('❓ Q&A request:', question);
    
    const result = await answerQuestion(question, context, useKnowledgeBase);
    res.json(result);
  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/qna/vote/:qaId', async (req, res) => {
  try {
    const { qaId } = req.params;
    const { helpful } = req.body;
    
    await updateQnAVote(qaId, helpful);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/search/captions', async (req, res) => {
  try {
    const { q, lang, sessionId, limit = 10 } = req.query;
    
    console.log('🔍 Caption search request:', { q, lang, sessionId, limit });

    if (!q || q.trim() === '') {
      return res.json({
        total: 0,
        results: [],
        message: 'Please provide a search query'
      });
    }

    let searchQuery = `"${q.trim()}"`;
    
    const filters = [];
    if (lang && lang.trim()) {
      filters.push(`@lang:{${lang.trim()}}`);
    }
    if (sessionId && sessionId.trim()) {
      filters.push(`@session_id:{${sessionId.trim()}}`);
    }
    
    if (filters.length > 0) {
      searchQuery = `${searchQuery} ${filters.join(' ')}`;
    }

    console.log('🔍 Final search query:', searchQuery);

    const searchResults = await redis.ft.search('idx:captions', searchQuery, {
      LIMIT: { from: 0, size: parseInt(limit) },
      SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' }
    });

    console.log(`✅ Found ${searchResults.total} caption results`);

    const results = searchResults.documents.map(doc => {
      const data = doc.value;
      return {
        id: doc.id,
        text: data.text,
        lang: data.lang,
        timestamp: data.timestamp,
        session_id: data.session_id,
        confidence: data.confidence,
        source: data.source
      };
    });

    res.json({
      total: searchResults.total,
      results: results,
      query: searchQuery
    });

  } catch (error) {
    console.error('❌ Caption search error:', error);
    res.status(500).json({ 
      error: error.message,
      total: 0,
      results: []
    });
  }
});

app.get('/search/knowledge', async (req, res) => {
  try {
    const { q, category, limit = 5 } = req.query;
    
    console.log('🔍 Knowledge search request:', { q, category, limit });

    if (!q || q.trim() === '') {
      return res.json({
        total: 0,
        results: [],
        message: 'Please provide a search query'
      });
    }

    let searchQuery = `"${q.trim()}"`;
    
    if (category && category.trim()) {
      searchQuery = `${searchQuery} @category:{${category.trim()}}`;
    }

    console.log('🔍 Knowledge search query:', searchQuery);

    const searchResults = await redis.ft.search('idx:knowledge', searchQuery, {
      LIMIT: { from: 0, size: parseInt(limit) },
      SORTBY: { BY: 'votes', DIRECTION: 'DESC' }
    });

    console.log(`✅ Found ${searchResults.total} knowledge results`);

    const results = searchResults.documents.map(doc => {
      const data = doc.value;
      return {
        id: doc.id,
        question: data.question,
        answer: data.answer,
        category: data.category,
        votes: data.votes || 0,
        views: data.views || 0,
        timestamp: data.timestamp
      };
    });

    res.json({
      total: searchResults.total,
      results: results,
      query: searchQuery
    });

  } catch (error) {
    console.error('❌ Knowledge search error:', error);
    res.status(500).json({ 
      error: error.message,
      total: 0,
      results: []
    });
  }
});

app.get('/debug/search', async (req, res) => {
  try {
    const debugData = {
      redis_connected: false,
      indexes: {},
      data_counts: { captions: 0, qa_entries: 0 },
      sample_data: {},
      timestamp: new Date().toISOString()
    };

    try {
      await redis.ping();
      debugData.redis_connected = true;
    } catch (pingErr) {
      debugData.redis_connected = false;
      debugData.redis_error = pingErr.message;
    }

    try {
      await redis.ft.info('idx:captions');
      debugData.indexes.captions = { status: 'exists' };
    } catch (err) {
      debugData.indexes.captions = { status: 'missing', error: err.message };
    }

    try {
      await redis.ft.info('idx:knowledge');
      debugData.indexes.knowledge = { status: 'exists' };
    } catch (err) {
      debugData.indexes.knowledge = { status: 'missing', error: err.message };
    }

    if (debugData.indexes.captions?.status === 'exists') {
      try {
        const searchAll = await redis.ft.search('idx:captions', '*', {
          LIMIT: { from: 0, size: 0 }
        });
        debugData.data_counts.captions = searchAll.total;
      } catch (searchErr) {
        debugData.data_counts.captions_error = searchErr.message;
      }
    }

    if (debugData.indexes.knowledge?.status === 'exists') {
      try {
        const searchAll = await redis.ft.search('idx:knowledge', '*', {
          LIMIT: { from: 0, size: 0 }
        });
        debugData.data_counts.qa_entries = searchAll.total;
      } catch (searchErr) {
        debugData.data_counts.qa_error = searchErr.message;
      }
    }

    res.json(debugData);

  } catch (error) {
    console.error('❌ Simple debug endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Basic debug check failed'
    });
  }
});


app.post('/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    const result = await translateText(text, targetLang);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const analytics = await redis.multi()
      .get(`analytics:captions:${today}`)
      .sCard(`analytics:active_sessions:${today}`)
      .zRangeWithScores('qa:leaderboard', 0, 4, { REV: true })
      .exec();

    res.json({
      captions_today: parseInt(analytics[0]) || 0,
      active_sessions: parseInt(analytics[1]) || 0,
      top_qas: analytics[2] || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const wss = new WebSocketServer({ server });

function broadcastToClients(message) {
  wsConnections.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('📱 New WebSocket client connected');
  wsConnections.add(ws);
  
  ws.send(JSON.stringify({
    type: 'connection_status',
    data: { status: 'connected', message: 'WebSocket connected successfully!' }
  }));
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket message received:', data);
      
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'subscribe_captions':
          break;
        case 'live_transcription':
          handleLiveAudio(ws, data.audioChunk, data.sessionId);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
    wsConnections.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsConnections.delete(ws);
  });
});

async function handleLiveAudio(ws, audioChunk, sessionId) {
  const liveCaption = {
    text: `Live audio transcription at ${new Date().toLocaleTimeString()}...`,
    lang: 'en',
    timestamp: Date.now(),
    session_id: sessionId || 'live_audio',
    confidence: 0.92,
    source: 'live_audio',
    id: Date.now() + Math.random()
  };
  
  await addCaptionToStream(liveCaption.text, liveCaption.lang, {
    sessionId: liveCaption.session_id,
    confidence: liveCaption.confidence
  });
  
  broadcastToClients(JSON.stringify({
    type: 'new_caption',
    data: liveCaption
  }));
}

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Enhanced Redis AI Backend running on http://localhost:${PORT}`);
  console.log('📊 Features enabled:');
  console.log('  ✅ Redis Streams for real-time data');
  console.log('  ✅ WebSocket broadcasting for live captions');
  console.log('  ✅ Full-text search on captions & knowledge base');
  console.log('  ✅ AI response caching & semantic caching');
  console.log('  ✅ Pub/Sub pattern subscriptions');
  console.log('  ✅ Consumer groups for scalability');
  console.log('  ✅ Real-time analytics & leaderboards');
  console.log('  ✅ File upload & audio transcription');
});
