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

export function answerQuestion(question, context = "", useKnowledgeBase = true) {
  return new Promise(async (resolve, reject) => {
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
    } catch (err) {
      console.log('Cache check failed for LLM, proceeding with fresh query');
    }


    const safeContext = context.trim() || "This is a question about accessibility, AI, or technology in general. Please provide a helpful answer based on your knowledge.";


    const py = spawn('python', [
      path.resolve("../python-ai/llm_qa.py"),
      question,
      safeContext
    ]);
    
    let output = "";
    let errorOutput = "";
    
    py.stdout.on('data', data => {
      output += data.toString();
    });
    
    py.stderr.on('data', err => {
      errorOutput += err.toString();
      console.error("LLM stderr:", err.toString());
    });
    
    py.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error(`LLM process exited with code ${code}`);
          return resolve({ 
            answer: "I apologize, but I'm having trouble processing your question right now. Please try again.", 
            source: 'error',
            confidence: 0 
          });
        }


        const result = JSON.parse(output.trim());
        const enhancedResult = {
          ...result,
          source: 'llm',
          confidence: result.confidence || 0.7,
          timestamp: Date.now()
        };
        
        try {
          await redis.setEx(cacheKey, 7200, JSON.stringify(enhancedResult));
        } catch (cacheErr) {
          console.error('Failed to cache LLM result:', cacheErr);
        }
        
        resolve(enhancedResult);
      } catch (e) {
        console.error('Failed to parse LLM output:', e);
        console.error('Raw output:', output);
        resolve({ 
          answer: "I couldn't process your question properly. Please try rephrasing it.", 
          source: 'error',
          confidence: 0 
        });
      }
    });
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
