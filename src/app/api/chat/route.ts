import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import { generateResponse } from '@/lib/ai/gemini';
// Don't validate during build
const isBuildPhase = typeof process !== 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   process.env.NEXT_PHASE === 'phase-export');

// Helper function to get allowed origins
function getAllowedOrigins(): string[] {
  // Default to allowing all origins in development
  if (process.env.NODE_ENV === 'development' || isBuildPhase) {
    return ['*'];
  }

  // In production, only allow specific origins
  const origins = [
    'http://localhost:3000',
    'https://*.vercel.app',
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`,
  ].filter(Boolean) as string[];

  return origins.length > 0 ? origins : ['*'];
}

// Helper function to create CORS headers
function createCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  // In development or build phase, allow all origins
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

export async function POST(request: NextRequest) {
  // Get client IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
  
  // Create CORS headers for the response
  
  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 204, // No Content
        headers: createCorsHeaders(request)
      });
    }

    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: createCorsHeaders(request) }
      );
    }

    if (!body || !body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message must be a non-empty string' },
        { status: 400, headers: createCorsHeaders(request) }
      );
    }

    const { message } = body;
    const origin = request.headers.get('origin') || '';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    console.log('Processing chat message:', { 
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      origin,
      timestamp: new Date().toISOString()
    });

    // Generate AI response with timeout
    let aiResponse: string;
    try {
      const startTime = Date.now();
      
      // Start both AI response and storage in parallel
      const [response] = await Promise.all([
        // AI Response with timeout
        Promise.race([
          generateResponse(message, clientIp),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('AI response timeout')), AI_RESPONSE_TIMEOUT)
          ),
        ]),
        // Store the user message in MongoDB (non-blocking)
        !isBuildPhase ? storeChatMessage(message, '', origin, userAgent) : Promise.resolve()
      ]);
      
      aiResponse = response;
      const processingTime = Date.now() - startTime;
      
      // Update the stored message with AI response (non-blocking)
      if (!isBuildPhase) {
        storeChatMessage(message, aiResponse, origin, userAgent)
          .catch(console.error);
      }
      
      console.log(`Processed message in ${processingTime}ms`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating AI response:', {
        error: errorMessage,
        messagePreview: message.substring(0, 100),
        ip: clientIp,
        timestamp: new Date().toISOString()
      });
      
      // Return appropriate error message
      if (errorMessage.includes('timeout')) {
        throw new Error('AI service is taking too long to respond. Please try again.');
      } else if (errorMessage.includes('Rate limit')) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      } else {
        throw new Error('Failed to generate response. Please try again.');
      }
    }

    const responseHeaders = createCorsHeaders(request);
    
    return NextResponse.json(
      { response: aiResponse },
      { headers: responseHeaders }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('timeout') ? 504 : 500;
    
    console.error('Error in chat API:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode,
      timestamp: new Date().toISOString()
    });

    const errorHeaders = createCorsHeaders(request);
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { 
        status: statusCode,
        headers: errorHeaders
      }
    );
  }
}

// Store chat message in MongoDB (non-blocking)
async function storeChatMessage(
  userMessage: string,
  aiResponse: string,
  origin: string,
  userAgent: string
): Promise<void> {
  try {
    const client = await clientPromise.catch(() => null);
    if (!client) {
      console.warn('MongoDB client not available, skipping message storage');
      return;
    }

    const db = client.db('chatbot');
    await db.collection('chats').insertOne({
      userMessage,
      aiResponse,
      timestamp: new Date(),
      metadata: {
        origin,
        userAgent,
        environment: process.env.NODE_ENV || 'development',
      }
    });
    console.log('Chat saved to MongoDB');
  } catch (error) {
    console.error('MongoDB storage error:', error);
    throw error; // Re-throw to be caught by the caller
  }
}