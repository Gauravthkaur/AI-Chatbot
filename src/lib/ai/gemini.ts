import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Simple in-memory cache with TTL
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache TTL

// Don't validate during build
const isBuildPhase = typeof process !== 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   process.env.NEXT_PHASE === 'phase-export');

// Rate limiting
const RATE_LIMIT = 10; // requests per minute
const rateLimitMap = new Map<string, number[]>();

// Only log in non-build environments
if (!process.env.GEMINI_API_KEY && !isBuildPhase) {
  console.warn('GEMINI_API_KEY is not set in environment variables');
}

// Create a dummy client during build or when API key is missing
let genAI: GoogleGenerativeAI | null = null;

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
  }
}

// System prompt to ensure professional responses
const SYSTEM_PROMPT = `You are a friendly, helpful, and slightly witty AI assistant. Keep your responses concise and engaging. You are part of a chat application where history is saved.'
`;

// Format the response to handle markdown and code blocks
function formatResponse(text: string): string {
  if (!text) return '';
  
  // Simple markdown to HTML conversion for code blocks
  return text
    .replace(/```(\w*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Remove any "AI:" or "Assistant:" prefixes
    .replace(/^(AI:|Assistant:)\s*/i, '')
    // Ensure proper spacing after punctuation
    .replace(/([.!?])\s*(\w)/g, '$1 $2')
    // Fix multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Ensure proper spacing around list items
    .replace(/^(-|\*)\s*/gm, '• ')
    // Trim any excess whitespace
    .trim();
}

// Dummy response for when Gemini is not available
const DUMMY_RESPONSES = [
  "I'm having trouble connecting to the AI service. Please check your API key and try again.",
  "I'm currently unable to process your request. Please try again later.",
  "The AI service is temporarily unavailable. Please check your internet connection and try again.",
  "I'm sorry, but I can't process your request right now. Please try again in a few moments."
];

function getDummyResponse(): string {
  return DUMMY_RESPONSES[Math.floor(Math.random() * DUMMY_RESPONSES.length)];
}

// Simple rate limiter
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  const requestTimestamps = rateLimitMap.get(ip) || [];
  const recentRequests = requestTimestamps.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  rateLimitMap.set(ip, [...recentRequests, now]);
  return true;
}

export async function generateResponse(message: string, ip?: string): Promise<string> {
  // Return a dummy response during build
  if (isBuildPhase) {
    return getDummyResponse();
  }
  
  // Check rate limit if IP is provided
  if (ip && !checkRateLimit(ip)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  // Check cache first
  const cacheKey = message.trim().toLowerCase();
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.response;
  }

  // If no API key or initialization failed, return a dummy response
  if (!genAI) {
    console.error('Gemini API is not properly initialized');
    return getDummyResponse();
  }

  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-04-17',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // Combine system prompt with user message
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I will be a helpful, friendly, and concise AI assistant.' }],
        },
      ],
    });

    // Send the message and get the response
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Received empty response from AI model');
    }
    
    // Post-process the response
    const formattedResponse = formatResponse(text);
    
    // Cache the response
    responseCache.set(cacheKey, {
      response: formattedResponse,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries
    if (responseCache.size > 1000) { // Prevent memory leaks
      const now = Date.now();
      for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          responseCache.delete(key);
        }
      }
    }
    
    return formattedResponse;
  } catch (error) {
    console.error('Error in generateResponse:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      messagePreview: message ? `${message.substring(0, 50)}...` : 'No message',
    });
    
    // Provide more specific error messages when possible
    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Gemini API usage limits.');
      }
    }
    
    throw new Error('Failed to generate response. Please try again later.');
  }
}
