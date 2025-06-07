import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateResponse } from '@/lib/gemini';

// Helper function to get allowed origins
function getAllowedOrigins() {
  return [
    'http://localhost:3000',
    'https://*.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
  ].filter(Boolean);
}

// Helper function to create CORS headers
function createCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  // In development, allow all origins for easier testing
  const isAllowedOrigin = process.env.NODE_ENV === 'development' 
    ? true 
    : allowedOrigins.some(allowed => origin.endsWith(allowed.replace('*.', '')));

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function POST(request: NextRequest) {
  const headers = createCorsHeaders(request);
  
  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { headers });
    }

    // Validate request body
    const body = await request.json().catch(() => null);
    if (!body || !body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body. Message must be a non-empty string.' },
        { status: 400, headers }
      );
    }

    const { message } = body;
    const origin = request.headers.get('origin') || '';
    
    console.log('Processing chat message:', { 
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      origin,
      timestamp: new Date().toISOString()
    });

    // Generate AI response with timeout
    const aiResponse = await Promise.race([
      generateResponse(message),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30s')), 30000)
      ),
    ]) as string;

    // Try to store in MongoDB if available
    try {
      const client = await clientPromise.catch(() => null);
      if (client) {
        const db = client.db('chatbot');
        await db.collection('chats').insertOne({
          userMessage: message,
          aiResponse,
          timestamp: new Date(),
          metadata: {
            origin,
            userAgent: request.headers.get('user-agent') || '',
            environment: process.env.NODE_ENV || 'development',
          }
        });
        console.log('Chat saved to MongoDB');
      } else {
        console.warn('MongoDB client not available, skipping message storage');
      }
    } catch (dbError) {
      console.error('MongoDB storage error (non-fatal):', dbError);
      // Continue execution even if storage fails
    }

    return NextResponse.json(
      { response: aiResponse },
      { headers }
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

    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { 
        status: statusCode,
        headers: {
          ...headers,
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: createCorsHeaders(request)
  });
}