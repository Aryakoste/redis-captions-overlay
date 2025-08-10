import redis from './redis.js';
import { v4 as uuidv4 } from 'uuid';

// Enhanced caption streaming with metadata and search indexing
export async function addCaptionToStream(text, lang = "en", metadata = {}) {
  const captionId = uuidv4();
  const timestamp = Date.now();
  const confidence = metadata.confidence || 0.95;
  const sessionId = metadata.sessionId || 'default';
  const source = metadata.source || 'manual';

  try {
    const streamId = await redis.xAdd('captions', '*', {
      text,
      lang,
      timestamp: timestamp.toString(),
      session_id: sessionId,
      confidence: confidence.toString(),
      caption_id: captionId,
      source
    });

    await redis.json.set(`caption:${captionId}`, '$', {
      text,
      lang,
      timestamp,
      session_id: sessionId,
      confidence,
      stream_id: streamId,
      source,
      searchable: true
    });

    console.log(`📝 Caption stored for search: caption:${captionId}`);

    await redis.publish('caption_updates', JSON.stringify({
      action: 'new_caption',
      caption_id: captionId,
      text,
      lang,
      timestamp
    }));

    await updateCaptionAnalytics(lang, sessionId);

    return { captionId, streamId };
    
  } catch (error) {
    console.error('❌ Error adding caption:', error);
    throw error;
  }
}

// Enhanced Q&A with knowledge base and voting
export async function addQnAToKnowledgeBase(question, answer, category = 'general') {
  const qaId = uuidv4();
  const timestamp = Date.now();

  try {
    await redis.json.set(`qa:${qaId}`, '$', {
      question,
      answer,
      category,
      timestamp,
      votes: 0,
      helpful_count: 0,
      views: 0
    });

    console.log(`📚 Q&A stored for search: qa:${qaId}`);

    // Add to stream for real-time Q&A feed
    await redis.xAdd('qna_stream', '*', {
      qa_id: qaId,
      question,
      category,
      timestamp: timestamp.toString()
    });

    return qaId;
    
  } catch (error) {
    console.error('❌ Error adding Q&A:', error);
    throw error;
  }
}

// Read captions from stream with consumer groups
export async function readCaptionsFromStream(groupName = 'caption_consumers', consumerName = 'consumer1', lastId = '>') {
  try {
    // Create consumer group if it doesn't exist
    try {
      await redis.xGroupCreate('captions', groupName, '0', { MKSTREAM: true });
    } catch (err) {
      // Group already exists, ignore
    }

    return await redis.xReadGroup(groupName, consumerName, {
      key: 'captions',
      id: lastId
    }, {
      COUNT: 10,
      BLOCK: 1000
    });
  } catch (error) {
    console.error('Stream read error:', error);
    return null;
  }
}

// Update analytics in Redis
async function updateCaptionAnalytics(lang, sessionId) {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Increment counters using Redis atomic operations
    await redis.multi()
      .incr(`analytics:captions:${today}`)
      .incr(`analytics:lang:${lang}:${today}`)
      .incr(`analytics:session:${sessionId}:${today}`)
      .sAdd(`analytics:active_sessions:${today}`, sessionId)
      .exec();
  } catch (error) {
    console.error('Analytics update error:', error);
  }
}

// Advanced pattern-based pub/sub subscriptions
export async function subscribeToPatterns(patterns, callback) {
  const subscriber = redis.duplicate();
  await subscriber.connect();

  for (const pattern of patterns) {
    await subscriber.pSubscribe(pattern, (message, channel) => {
      callback(JSON.parse(message), channel);
    });
  }

  return subscriber;
}

// Leaderboard for most helpful Q&As
export async function updateQnAVote(qaId, isHelpful = true) {
  try {
    if (isHelpful) {
      await redis.zIncrBy('qa:leaderboard', 1, qaId);
      await redis.json.numIncrBy(`qa:${qaId}`, '$.helpful_count', 1);
      await redis.json.numIncrBy(`qa:${qaId}`, '$.votes', 1);
    }
    await redis.json.numIncrBy(`qa:${qaId}`, '$.views', 1);
  } catch (error) {
    console.error('Vote update error:', error);
  }
}
