import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000
  }
});

redis.on('error', (err) => console.log('Redis Client Error', err));
redis.on('connect', () => console.log('✅ Connected to Redis Stack'));

await redis.connect();

async function createCaptionsIndex() {
  try {
    try {
      await redis.ft.dropIndex('idx:captions');
      console.log('🗑️ Dropped existing captions index');
    } catch (err) {
    }

    await redis.ft.create('idx:captions', {
      '$.text': {
        type: 'TEXT',
        AS: 'text'
      },
      '$.lang': {
        type: 'TAG',
        AS: 'lang'
      },
      '$.timestamp': {
        type: 'NUMERIC',
        AS: 'timestamp'
      },
      '$.session_id': {
        type: 'TAG',
        AS: 'session_id'
      },
      '$.confidence': {
        type: 'NUMERIC',
        AS: 'confidence'
      },
      '$.source': {
        type: 'TAG',
        AS: 'source'
      }
    }, {
      ON: 'JSON',
      PREFIX: 'caption:'
    });
    
    console.log('✅ Caption search index created successfully');
    return true;
  } catch (err) {
    if (err.message && err.message.includes('Index already exists')) {
      console.log('ℹ️ Caption index already exists');
      return true;
    } else {
      console.error('❌ Caption index creation error:', err.message);
      return false;
    }
  }
}

async function createKnowledgeIndex() {
  try {
    try {
      await redis.ft.dropIndex('idx:knowledge');
      console.log('🗑️ Dropped existing knowledge index');
    } catch (err) {
    }

    await redis.ft.create('idx:knowledge', {
      '$.question': {
        type: 'TEXT',
        AS: 'question'
      },
      '$.answer': {
        type: 'TEXT', 
        AS: 'answer'
      },
      '$.category': {
        type: 'TAG',
        AS: 'category'
      },
      '$.votes': {
        type: 'NUMERIC',
        AS: 'votes'
      },
      '$.timestamp': {
        type: 'NUMERIC',
        AS: 'timestamp'
      }
    }, {
      ON: 'JSON',
      PREFIX: 'qa:'
    });
    
    console.log('✅ Knowledge base search index created successfully');
    return true;
  } catch (err) {
    if (err.message && err.message.includes('Index already exists')) {
      console.log('ℹ️ Knowledge base index already exists');
      return true;
    } else {
      console.error('❌ Knowledge base index creation error:', err.message);
      return false;
    }
  }
}

async function initializeSearchData() {
  await createCaptionsIndex();
  await createKnowledgeIndex();
  
  try {
    const sampleCaptions = [
      {
        text: "Welcome to our Redis AI accessibility demo showcase",
        lang: "en",
        timestamp: Date.now() - 300000,
        session_id: "demo",
        confidence: 0.95,
        source: "sample"
      },
      {
        text: "This system provides real-time captions using Redis streams",
        lang: "en", 
        timestamp: Date.now() - 240000,
        session_id: "demo",
        confidence: 0.92,
        source: "sample"
      },
      {
        text: "AI-powered question answering with semantic search capabilities",
        lang: "en",
        timestamp: Date.now() - 180000,
        session_id: "demo", 
        confidence: 0.88,
        source: "sample"
      },
      {
        text: "Full-text search across all captions and knowledge base",
        lang: "en",
        timestamp: Date.now() - 120000,
        session_id: "demo",
        confidence: 0.90,
        source: "sample"
      }
    ];

    for (let i = 0; i < sampleCaptions.length; i++) {
      const captionId = `sample_${Date.now()}_${i}`;
      await redis.json.set(`caption:${captionId}`, '$', sampleCaptions[i]);
    }

    const sampleQAs = [
      {
        question: "What is Redis and how does it work?",
        answer: "Redis is an in-memory data structure store used as a database, cache, and message broker. It supports various data structures and provides high performance for real-time applications.",
        category: "technology",
        votes: 5,
        timestamp: Date.now() - 86400000
      },
      {
        question: "How does real-time streaming work in this application?",
        answer: "The application uses Redis Streams to capture and distribute real-time captions. WebSocket connections deliver updates instantly to all connected clients.",
        category: "streaming",
        votes: 3,
        timestamp: Date.now() - 43200000
      },
      {
        question: "What accessibility features are provided?",
        answer: "The system offers live captions, translation capabilities, Q&A assistance, and full-text search to make events accessible to users with different needs.",
        category: "accessibility",
        votes: 8,
        timestamp: Date.now() - 21600000
      }
    ];

    for (let i = 0; i < sampleQAs.length; i++) {
      const qaId = `sample_qa_${Date.now()}_${i}`;
      await redis.json.set(`qa:${qaId}`, '$', sampleQAs[i]);
    }

    console.log('✅ Sample search data initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize sample data:', error);
  }
}

await initializeSearchData();

export default redis;
