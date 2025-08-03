import React, { useState, useRef, useEffect } from 'react';
import supabaseGeminiService from '../services/supabaseGeminiService';

const StreamingChat = ({ userLevel = 'beginner', focusArea = 'conversation' }) => {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isStreaming) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');
    
    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsStreaming(true);
    setStreamingResponse('');

    try {
      // Send streaming message
      const result = await supabaseGeminiService.sendMessage(userMessage, {
        streaming: true,
        userLevel,
        focusArea
      });

      if (result.success && result.stream) {
        let fullResponse = '';
        let chunkCount = 0;
        
        // Process streaming chunks with optimized rendering
        for await (const chunk of result.stream) {
          if (chunk.chunk) {
            fullResponse += chunk.chunk;
            chunkCount++;
            
            // Update immediately for first few chunks, then batch for performance
            if (chunkCount <= 3 || chunkCount % 2 === 0) {
              setStreamingResponse(fullResponse);
            }
          }
          
          if (chunk.done) {
            // Add final response to messages
            const aiMessage = {
              id: Date.now() + 1,
              type: 'assistant',
              content: fullResponse,
              timestamp: new Date(),
              provider: result.provider
            };
            
            setMessages(prev => [...prev, aiMessage]);
            setStreamingResponse('');
            break;
          }
        }
      } else {
        // Fallback to non-streaming response
        const aiMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: result.message || 'Sorry, I encountered an error.',
          timestamp: new Date(),
          provider: result.provider || 'fallback'
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Streaming chat error:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setStreamingResponse('');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingResponse('');
    supabaseGeminiService.startNewSession();
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-blue-50 rounded-t-lg">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Streaming Chat</h2>
          <p className="text-sm text-gray-600">
            Level: {userLevel} | Focus: {focusArea}
          </p>
        </div>
        <button
          onClick={clearChat}
          className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingResponse && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">👋 Welcome to Streaming Chat!</p>
            <p>Start a conversation and see responses appear in real-time.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.isError
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <div className="flex justify-between items-center mt-2 text-xs opacity-70">
                <span>{message.timestamp.toLocaleTimeString()}</span>
                {message.provider && (
                  <span className="ml-2">via {message.provider}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Streaming Response - Optimized for fast display */}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-gray-800 border-2 border-blue-300 shadow-sm">
              <p className="whitespace-pre-wrap font-medium">{streamingResponse}</p>
              <div className="flex items-center mt-2 text-xs text-blue-700">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="ml-2 font-semibold">⚡ Live streaming...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <div className="flex space-x-2">
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send)"
            className="flex-1 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentInput.trim() || isStreaming}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              !currentInput.trim() || isStreaming
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isStreaming ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Sending...</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </div>
        
        {/* Status Indicator - Enhanced */}
        <div className="mt-2 text-xs text-gray-500">
          {isStreaming ? (
            <span className="text-blue-600 font-medium">⚡ Ultra-fast streaming active...</span>
          ) : (
            <span>🚀 Tip: Optimized for sub-second response times</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamingChat;