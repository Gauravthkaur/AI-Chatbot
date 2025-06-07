import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Check for API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in environment variables');
  throw new Error('API key not configured. Please check your environment variables.');
}

// Initialize the Gemini API client with error handling
let genAI: GoogleGenerativeAI;
try {
  genAI = new GoogleGenerativeAI(apiKey);
} catch (error) {
  console.error('Failed to initialize Gemini API:', error);
  throw new Error('Failed to initialize AI service. Please check your API key.');
}

// System prompt to ensure professional responses
const SYSTEM_PROMPT = `You are a friendly, helpful, and slightly witty AI assistant. Keep your responses concise and engaging. You are part of a chat application where history is saved.'
`;

export async function generateResponse(message: string): Promise<string> {
  if (!message?.trim()) {
    throw new Error('Message cannot be empty');
  }

  try {
    console.log('Generating response for message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
    
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

function formatResponse(text: string): string {
  return text
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