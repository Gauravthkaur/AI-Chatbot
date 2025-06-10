// File: lib/ai/gemini.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { kv } from '@vercel/kv'; // Import Vercel KV

// --- Configuration Constants ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest"; // Using the latest flash model
const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes
const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // Max 15 requests per minute per IP

// --- Best Practice: Singleton for Gemini Client ---
// This ensures we only initialize the client once per server instance.
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

const safetySettings = [
  // NOTE: These settings disable all safety filters. This is generally not recommended
  // unless you have a specific need and understand the risks.
  // Consider using BLOCK_MEDIUM_AND_ABOVE for a safer default.
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const generationConfig = {
  maxOutputTokens: 1500,
  temperature: 0.7,
};

// --- Main Function to Generate Response ---
export async function generateResponse(message: string, ip: string): Promise<string> {
  // During build phase, do not proceed.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return "AI response generation is disabled during build.";
  }

  // 1. Rate Limiting using Vercel KV
  const rateLimitKey = `ratelimit:${ip}`;
  const transaction = kv.multi();
  transaction.zadd(rateLimitKey, { score: Date.now(), member: Date.now() });
  transaction.zremrangebyscore(rateLimitKey, 0, Date.now() - (RATE_LIMIT_WINDOW_SECONDS * 1000));
  transaction.zcard(rateLimitKey);
  transaction.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  
  const [_, __, requestCount] = await transaction.exec<[number, number, number, number]>();

  if (requestCount > RATE_LIMIT_MAX_REQUESTS) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // 2. Caching using Vercel KV
  const cacheKey = `cache:${message.trim().toLowerCase()}`;
  const cachedResponse = await kv.get<string>(cacheKey);
  if (cachedResponse) {
    console.log(`Cache hit for: "${message.substring(0, 30)}..."`);
    return cachedResponse;
  }
  console.log(`Cache miss for: "${message.substring(0, 30)}..."`);

  try {
    // 3. Generate AI Content
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: MODEL_NAME, 
      safetySettings, 
      generationConfig 
    });

    // Use `generateContent` for single-turn requests, it's simpler than `startChat`
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Received empty response from AI model');
    }
    
    // 4. Store in Cache
    // We don't need to await this, it can happen in the background
    kv.set(cacheKey, text, { ex: CACHE_TTL_SECONDS });

    return text;

  } catch (error) {
    console.error('Error generating Gemini response:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Propagate a user-friendly error to be handled by the API route
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('permission denied'))) {
      throw new Error('AI service authentication failed. Please check configuration.');
    }
    throw new Error('Failed to generate response from AI service.');
  }
}