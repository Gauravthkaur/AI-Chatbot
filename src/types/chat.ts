export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  messageId: string;
  timestamp: string;
}
