import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Please add your Gemini API key to .env.local');
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt to ensure professional responses
const SYSTEM_PROMPT = `You are a friendly, helpful, and slightly witty AI assistant. Keep your responses concise and engaging. You are part of a chat application where history is saved.'
`;

export async function generateResponse(message: string): Promise<string> {
  try {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });
    
    // Combine system prompt with user message
    const formattedMessage = `${SYSTEM_PROMPT}\n\nUser: ${message}`;
    
    // Generate content with safety settings
    const result = await model.generateContent(formattedMessage);
    const response = await result.response;
    const text = response.text();
    
    // Post-process the response
    const formattedResponse = formatResponse(text);
    
    return formattedResponse;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response. Please try again later.');
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