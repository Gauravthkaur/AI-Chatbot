// File: lib/ai/gemini.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// --- Types ---
type Cache = Map<string, { value: string; timeout: NodeJS.Timeout }>;

declare global {
  // eslint-disable-next-line no-var
  var __geminiCache: Cache | undefined;
}

// --- Configuration Constants ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest"; // Using the latest flash model
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Initialize global cache if it doesn't exist
if (!global.__geminiCache) {
  global.__geminiCache = new Map();
}

const cache = global.__geminiCache!;

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

  // 1. Simple in-memory rate limiting
  const now = Date.now();
  const rateLimit = rateLimitMap.get(ip);
  
  if (rateLimit) {
    if (now > rateLimit.resetTime) {
      // Reset the counter if window has passed
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    } else if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else {
      // Increment the counter
      rateLimit.count++;
      rateLimitMap.set(ip, rateLimit);
    }
  } else {
    // First request from this IP
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }
  
  // 2. Simple in-memory cache (for development only)
  // In production, consider using a proper caching solution
  const cacheKey = message.trim().toLowerCase();
  
  // Check if we have a cached response that hasn't expired
  const cachedItem = cache.get(cacheKey);
  if (cachedItem) {
    console.log(`Cache hit for: "${message.substring(0, 30)}..."`);
    return cachedItem.value;
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

    // System prompt to guide the AI's tone and style
    const systemPrompt = `You are a friendly, helpful, and slightly witty AI assistant. Keep your responses concise and engaging. You are part of a chat application where history is saved.`;
    
    // Combine system prompt with user message
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
    
    // Generate content with the guided prompt
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Ensure the response ends with proper punctuation
    if (!/[.!?]$/.test(text)) {
      text = text.replace(/[,\s]*$/, '.') + ' :)';
    }

    if (!text) {
      throw new Error('Received empty response from AI model');
    }
    
    // 4. Cache the response in memory (for development only)
    const timeout = setTimeout(() => {
      cache.delete(cacheKey);
    }, CACHE_TTL_MS);
    
    cache.set(cacheKey, { value: text, timeout });

    return text;

  } catch (error) {
    console.error('Error generating Gemini response:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // User-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('API key not valid') || error.message.includes('permission denied')) {
        throw new Error('Oops! Having trouble connecting to the AI service. Please try again later.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('I\'m getting too many requests right now. Please give me a moment and try again!');
      } else if (error.message.includes('content policy')) {
        throw new Error('I can\'t respond to that request, but I\'m happy to help with other questions!');
      }
    }
    throw new Error('Sorry, I ran into an issue. Could you try asking again?');
  }
}