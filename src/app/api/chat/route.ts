import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateResponse } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate AI response
    const aiResponse = await generateResponse(message);

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('chatbot');
    const chatsCollection = db.collection('chats');

    // Store the conversation in MongoDB
    await chatsCollection.insertOne({
      userMessage: message,
      aiResponse,
      timestamp: new Date(),
    });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}