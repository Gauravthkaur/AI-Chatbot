'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/chat';

interface ChatWindowProps {
  onClose: () => void;
}

const ChatWindow = ({ onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any event bubbling
    e.stopPropagation(); // Ensure the event doesn't propagate
    
    console.log('Close button clicked'); // Debug log
    
    // First set visibility to false to trigger animation
    setIsVisible(false);
    
    // Ensure the animation runs with proper cleanup
    if (chatWindowRef.current) {
      chatWindowRef.current.style.transform = 'translateY(20px) scale(0.95)';
      chatWindowRef.current.style.opacity = '0';
      chatWindowRef.current.classList.add('closing');
      chatWindowRef.current.removeAttribute('data-visible');
      
      // Remove pointer events during animation
      chatWindowRef.current.style.pointerEvents = 'none';
    }
    
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      console.log('Closing animation complete');
      if (typeof onClose === 'function') {
        onClose();
      }
    }, 350);
  };

  useEffect(() => {
    // Sequential animation timeline
    const timeline = async () => {
      // Initial window animation
      requestAnimationFrame(() => {
        setIsVisible(true);
        chatWindowRef.current?.setAttribute('data-visible', 'true');
      });
      
      // Delay before showing welcome message
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Show welcome message
      setMessages([{
        id: '1',
        content: '👋 Hi there! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
      }]);

      // Brief delay before focusing input
      await new Promise(resolve => setTimeout(resolve, 450));
      inputRef.current?.focus();
    };

    timeline();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to get response: ${response.status}`);
      }
      
      // Calculate and apply natural typing delay
      await new Promise(resolve => 
        setTimeout(resolve, Math.min(1000, 300 + data.response.length * 0.01))
      );
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      // Focus input after response
      inputRef.current?.focus();
    }
  };

  return (
    <div
      ref={chatWindowRef}
      className={`
        chat-window
        fixed
        sm:bottom-6 sm:right-6
        bottom-[5vh] right-[5vw]
        w-[90vw] sm:w-[320px]
        h-[80vh] sm:h-[480px]
        max-h-[600px]
        bg-white dark:bg-gray-800
        rounded-2xl sm:rounded-2xl
        overflow-hidden flex flex-col
        border border-gray-100 dark:border-gray-700
        shadow-[0_8px_30px_rgb(0,0,0,0.12)]
        transform origin-bottom-right
        transition-all duration-300 ease-in-out
        ${!isVisible ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
        backdrop-blur-md bg-white/80 dark:bg-gray-800/90
      `}
    >
      {/* Header */}
      <div className="chat-header bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white px-3 sm:px-4 py-2.5 sm:py-3 relative sticky top-0">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('/window.svg')] opacity-10 bg-repeat bg-center mix-blend-overlay" />
        
        {/* Content wrapper */}
        <div className="relative z-10 flex items-center justify-between">
          {/* Left side with icon and title */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 transform transition-transform group-hover:rotate-12" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base tracking-tight">Chat Assistant</h3>
              <p className="text-[10px] sm:text-xs text-white/80 flex items-center">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 inline-block mr-2 animate-pulse" />
                <span className="hidden sm:inline">Online • </span>Usually replies instantly
              </p>
            </div>
          </div>

          {/* Close button */}
          <button 
            onClick={handleClose}
            className="relative z-20 ml-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 
              transition-all duration-200 transform hover:scale-105 active:scale-95"
            aria-label="Close chat"
            title="Close chat"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        className="chat-messages flex-1 px-4 sm:px-6 py-6 space-y-4 overflow-y-auto
          overscroll-contain touch-manipulation 
          [scrollbar-width:thin] [scrollbar-color:#c7d2fe_#f3f4f6]
          [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]
          [scroll-behavior:smooth] [transform:translateZ(0)]"
      >
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex items-end space-x-2 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            } float-in message-delay-${Math.min(index, 5)}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center avatar-appear">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                </svg>
              </div>
            )}
            <div
              className={`
                chat-message
                max-w-[75%] rounded-2xl px-4 py-3
                ${message.role === 'user' 
                  ? 'bg-[#7C3AED] text-white ml-2 shadow-[0_2px_8px_rgba(124,58,237,0.25)] hover:shadow-[0_4px_12px_rgba(124,58,237,0.3)]' 
                  : 'bg-gray-100/90 dark:bg-gray-700/90 text-gray-900 dark:text-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                }
                backdrop-blur-[2px] transition-all duration-200
              `}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              <time className="block text-[10px] mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </time>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-end space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center avatar-appear">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              </svg>
            </div>
            <div className="typing-indicator">
              <div className="flex items-center h-4">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input sticky bottom-0 p-2 sm:p-3 bg-white/95 dark:bg-gray-800/95 border-t border-gray-100/50 dark:border-gray-700/50 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2 mx-auto max-w-[640px]">
          <div className="flex-1 relative input-focus-ring group">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#9061E8] to-[#7C3AED] opacity-[0.15] group-hover:opacity-[0.25] transition-opacity blur-md" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="w-full pl-3 pr-10 py-2.5 bg-white/80 dark:bg-gray-800/80 rounded-xl
                border-2 border-transparent focus:border-[#7C3AED]/50 dark:focus:border-[#7C3AED]/50
                text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400
                text-[15px] leading-relaxed focus:outline-none transition-all duration-200
                hover:bg-white dark:hover:bg-gray-800/90
                backdrop-blur-xl shadow-[0_2px_12px_rgba(124,58,237,0.08)]
                disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              title="Send message"
              aria-label="Send message"
              className="send-button
                absolute right-2 bottom-1/2 translate-y-1/2 p-2.5 
                bg-[#7C3AED] text-white rounded-xl
                hover:bg-[#6D28D9] active:bg-[#5B21B6]
                transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#7C3AED]
                disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90 transition-transform group-hover:scale-110" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;