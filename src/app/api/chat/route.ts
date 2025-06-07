import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateResponse } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Add CORS headers
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = [
      'http://localhost:3000',
      'https://*.vercel.app',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
    ].filter(Boolean);

    // In development, allow all origins for easier testing
    const isAllowedOrigin = process.env.NODE_ENV === 'development' 
      ? true 
      : allowedOrigins.some(allowed => origin.endsWith(allowed.replace('*.', '')));

    const headers = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    console.log('Request origin:', origin, 'Allowed origins:', allowedOrigins);

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

    // Generate AI response with timeout
    const aiResponse = await Promise.race([
      generateResponse(message),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      ),
    ]) as string;

    // Verify MongoDB connection
    const client = await clientPromise;
    const db = client.db('chatbot');
    const chatsCollection = db.collection('chats');

    // Store the conversation with error handling
    try {
      await chatsCollection.insertOne({
        userMessage: message,
        aiResponse,
        timestamp: new Date(),
        metadata: {
          origin,
          userAgent: request.headers.get('user-agent'),
        }
      });
    } catch (dbError) {
      console.error('MongoDB error:', dbError);
      // Continue execution even if storage fails
    }

    return NextResponse.json(
      { response: aiResponse },
      { headers }
    );

  } catch (error) {
    console.error('Error processing chat message:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('timeout') ? 504 : 500;

    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { 
        status: statusCode,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}