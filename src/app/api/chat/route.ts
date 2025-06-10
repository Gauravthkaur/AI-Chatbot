import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb'; // Using the new robust connection module
import { generateResponse } from '@/lib/ai/gemini';
import { MongoClient } from 'mongodb';

// Don't interact with DB during build
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

// --- CORS Helper functions (Unchanged) ---
function getAllowedOrigins(): string[] {
  if (process.env.NODE_ENV === 'development' || isBuildPhase) {
    return ['*'];
  }
  const origins = [
    'http://localhost:3000',
    'https://*.vercel.app',
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`,
  ].filter(Boolean) as string[];
  return origins.length > 0 ? origins : ['*'];
}

function createCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  const isAllowedOrigin = process.env.NODE_ENV === 'development' || isBuildPhase || 
    allowedOrigins.includes('*') ||
    allowedOrigins.some(allowed => {
      try {
        return new URL(origin).origin === new URL(allowed).origin;
      } catch {
        return origin === allowed || origin.endsWith(allowed.replace('*.', ''));
      }
    });

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204, // No Content
    headers: createCorsHeaders(request)
  });
}

// Timeout for AI responses (ms)
const AI_RESPONSE_TIMEOUT = 10000; // 10 seconds

// **REFACTORED**: Main POST handler
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const body = await request.json();
    if (!body || !body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message must be a non-empty string' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { message } = body;
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const origin = request.headers.get('origin') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(`Processing chat message from ${clientIp}...`);

    // Get AI response with timeout
    const aiResponse = await Promise.race([
      generateResponse(message, clientIp),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('AI response timeout')), AI_RESPONSE_TIMEOUT)
      ),
    ]);
    
    // Store the complete chat with both user message and AI response
    if (!isBuildPhase) {
      await storeChatMessage(message, aiResponse, origin, userAgent, clientIp);
    }

    return NextResponse.json(
      { response: aiResponse },
      { headers: corsHeaders }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in chat API:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });

    let userFriendlyError = 'Failed to generate response. Please try again.';
    let statusCode = 500;

    if (errorMessage.includes('timeout')) {
      userFriendlyError = 'AI service is taking too long to respond. Please try again.';
      statusCode = 504; // Gateway Timeout
    } else if (errorMessage.includes('Rate limit')) {
      userFriendlyError = 'Too many requests. Please wait a moment before trying again.';
      statusCode = 429; // Too Many Requests
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyError,
        // Provide detailed error only in development for debugging
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { 
        status: statusCode,
        headers: corsHeaders
      }
    );
  }
}

// **REFACTORED**: Store chat message in a single, efficient operation
async function storeChatMessage(
  userMessage: string,
  aiResponse: string,
  origin: string,
  userAgent: string,
  ip: string
): Promise<void> {
  try {
    // This will use the cached promise from your robust mongodb.ts
    const client: MongoClient = await clientPromise;
    const db = client.db('chatbot'); // Use your database name
    
    await db.collection('chats').insertOne({
      userMessage,
      aiResponse,
      timestamp: new Date(),
      metadata: {
        origin,
        userAgent,
        ip,
        environment: process.env.NODE_ENV || 'development',
      }
    });

    console.log('Chat saved to MongoDB successfully.');
  } catch (error) {
    // Log the error and re-throw it so the non-blocking .catch() in the POST handler can see it.
    console.error('MongoDB storage error:', error);
    throw new Error('Failed to save chat message to the database.');
  }
}