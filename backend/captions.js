import { spawn } from 'child_process';
import path from "path";
import redis from './redis.js';
import crypto from 'crypto';
import { nodewhisper } from 'nodejs-whisper';

function getCacheKey(input, type) {
  return `ai_cache:${type}:${crypto.createHash('sha256').update(input).digest('hex')}`;
}

export async function transcribeAudio(audioPath, options = {}) {
  console.log(`🎵 Starting whisper.cpp transcription for: ${audioPath}`);

  const cacheKey = getCacheKey(audioPath + JSON.stringify(options), 'whisper_cpp');

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('📱 Returning cached whisper.cpp transcription');
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('Cache check failed, continuing without cache');
  }

  const modelName = options.modelName || 'base.en';

  try {
    const result = await nodewhisper(audioPath, {
      modelName,
      autoDownloadModelName: modelName,
      whisperOptions: {
        outputInText: true,
        outputInJson: true,
        translateToEnglish: false,
        language: options.language === 'auto' ? undefined : options.language
      }
    });

    const finalResult = typeof result === 'string'
      ? { text: result, confidence: 0.9, language: options.language || 'en' }
      : {
          text: result.text || '',
          confidence: 0.9,
          language: options.language || 'en',
          segments: result.segments || []
        };

    // Cache result in Redis for 1 hour
    await redis.setEx(cacheKey, 3600, JSON.stringify(finalResult));

    console.log('✅ whisper.cpp transcription completed');
    return finalResult;
  } catch (error) {
    console.error('❌ whisper.cpp transcription failed:', error);
    throw error;
  }
}

export async function processLiveAudioChunk(audioBuffer, sessionId, options = {}) {
  console.log(`🎙️ Processing live audio chunk: buffer length = ${audioBuffer.length}`);

  try {
    const modelName = options.modelName || 'base.en';

    const result = await nodewhisper(audioBuffer, {
      modelName,
      autoDownloadModelName: modelName,
      fromBuffer: true,
      whisperOptions: {
        outputInText: true,
        outputInJson: true,
        translateToEnglish: false,
        language: options.language === 'auto' ? undefined : options.language
      }
    });

    const finalResult = typeof result === 'string'
      ? { text: result, confidence: 0.85, language: options.language || 'en' }
      : {
          text: result.text || '',
          confidence: 0.85,
          language: options.language || 'en',
          segments: result.segments || []
        };

    return { ...finalResult, isLiveChunk: true, sessionId };
  } catch (error) {
    console.error('❌ Live audio chunk transcription failed:', error);
    return {
      text: `[Live transcription error: ${error.message}]`,
      confidence: 0,
      language: 'en',
      isLiveChunk: true,
      sessionId
    };
  }
}

export async function answerQuestion(question, context = "", useKnowledgeBase = true) {
  return new Promise(async (resolve) => {
    const cacheKey = getCacheKey(question + context, 'llm');

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log('🧠 Returning cached answer');
        const cachedResult = JSON.parse(cached);

        if (cachedResult.qa_id) {
          try {
            await redis.json.numIncrBy(`qa:${cachedResult.qa_id}`, '$.views', 1);
          } catch (err) {
            console.error('Failed to update view count:', err);
          }
        }

        return resolve(cachedResult);
      }
    } catch {
      console.log('Cache check failed for LLM, proceeding with fresh query');
    }

    const safeContext =
      context.trim() ||
      "This is a question about accessibility, AI, or technology in general. Please provide a helpful answer based on your knowledge.";

    const jobId = uuidv4();
    const jobPayload = {
      job_id: jobId,
      question,
      context: safeContext,
      useKnowledgeBase: String(useKnowledgeBase)
    };

    console.log(`📤 Enqueuing LLM job ${jobId}`);
    await redis.xAdd('llm_jobs', '*', { payload: JSON.stringify(jobPayload) });

    console.log(`⏳ Waiting for LLM worker result for job ${jobId}...`);
    const start = Date.now();
    while (true) {
      const results = await redis.xRead(
        { key: 'llm_results', id: '0' },
        { BLOCK: 5000, COUNT: 1 }
      );
      if (results) {
        for (const [, messages] of results) {
          for (const [msgId, fields] of messages) {
            const data = JSON.parse(fields.result);
            if (data.job_id === jobId) {
              console.log(`✅ Got LLM result for job ${jobId} in ${(Date.now() - start) / 1000}s`);
              
              const enhancedResult = {
                ...data,
                source: 'llm',
                confidence: data.confidence || 0.7,
                timestamp: Date.now()
              };

              try {
                await redis.setEx(cacheKey, 7200, JSON.stringify(enhancedResult));
              } catch (cacheErr) {
                console.error('Failed to cache LLM result:', cacheErr);
              }

              await redis.xDel('llm_results', msgId);

              return resolve(enhancedResult);
            }
          }
        }
      }
    }
  });
}


export async function translateText(text, targetLang = 'es') {
  const cacheKey = getCacheKey(text + targetLang, 'translate');
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.log('Translation cache check failed');
  }

  const translated = `[${targetLang.toUpperCase()}] ${text}`;
  const result = { translated, target_lang: targetLang, original: text };
  
  try {
    await redis.setEx(cacheKey, 86400, JSON.stringify(result));
  } catch (err) {
    console.error('Failed to cache translation:', err);
  }
  
  return result;
}
