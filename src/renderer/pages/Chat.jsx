import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, Bot, User, Loader2, Zap, Sparkles } from 'lucide-react';
import { useAudio } from '../providers/AudioProvider';
import { useProgress } from '../providers/ProgressProvider';
import { useAI } from '../providers/AIProvider';
import GeminiSettings from '../components/ui/GeminiSettings';

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your language learning assistant. How can I help you practice today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);
  const [currentRequestController, setCurrentRequestController] = useState(null);
  const [responseStats, setResponseStats] = useState({ totalRequests: 0, averageTime: 0, fastestTime: Infinity, slowestTime: 0 });
  // Streaming functionality removed for simple chatbot
  const { isRecording, startRecording, stopRecording, speakText } = useAudio();
  const { addXP, level: currentLevel } = useProgress();
  const {
    aiStatus,
    isReady,
    initializeAI,
    generateResponse,
    getStatusMessage,
    getStatusColor,
    conversationHistory,
    isGeminiAvailable,
    getAIStatus,
    startNewSession,
    getCurrentSessionId
  } = useAI();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initializationRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize AI service when component mounts
    if (aiStatus === 'not_initialized') {
      initializeAI().catch(error => {
        console.error('Failed to initialize AI:', error);
      });
    }
  }, [aiStatus, initializeAI]);

  useEffect(() => {
    // Start a new session when the chat component mounts
    if (isReady && !getCurrentSessionId()) {
      startNewSession();
      console.log('Started new chat session');
    }
  }, [isReady, startNewSession, getCurrentSessionId]);

  // Streaming event listeners removed for simple chatbot

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const startTime = Date.now();
    const trimmedMessage = message.trim();
    
    // Analyze and optimize message
    const optimization = optimizeMessageForProcessing(trimmedMessage);
    const { processedMessage, userNotification } = optimization;
    const complexity = analyzeMessageComplexity(trimmedMessage);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmedMessage, // Show original message to user
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Add user notification if message was optimized
    if (userNotification) {
      const notificationMessage = {
        id: Date.now() + 0.5,
        type: 'ai',
        content: `💡 ${userNotification}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notificationMessage]);
    }

    try {
      // Use regular response only (streaming removed for simple chatbot)
      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingMessage('Analyzing your message...');
      
      // Create an AbortController for cancellation
      const controller = new AbortController();
      setCurrentRequestController(controller);
      
      // Adaptive progress updates based on complexity
      const progressUpdateInterval = complexity.complexity === 'simple' ? 800 : complexity.complexity === 'moderate' ? 1200 : 1500;
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * (complexity.complexity === 'simple' ? 20 : 12);
        });
      }, progressUpdateInterval);
      
      // Dynamic loading messages based on complexity
      const timeouts = [];
      if (complexity.complexity === 'complex') {
        timeouts.push(setTimeout(() => setLoadingMessage('Processing complex request...'), 1500));
        timeouts.push(setTimeout(() => setLoadingMessage('Analyzing multiple aspects...'), 4000));
        timeouts.push(setTimeout(() => setLoadingMessage('Generating comprehensive response...'), 8000));
        timeouts.push(setTimeout(() => setLoadingMessage('Finalizing detailed answer...'), 12000));
      } else if (complexity.complexity === 'moderate') {
        timeouts.push(setTimeout(() => setLoadingMessage('Processing with AI...'), 2000));
        timeouts.push(setTimeout(() => setLoadingMessage('Generating response...'), 5000));
        timeouts.push(setTimeout(() => setLoadingMessage('Almost ready...'), 8000));
      } else {
        timeouts.push(setTimeout(() => setLoadingMessage('Getting quick response...'), 1500));
        timeouts.push(setTimeout(() => setLoadingMessage('Almost done...'), 3000));
      }
      
      let response;
      if (isReady) {
        // Use AI provider with processed message
        response = await generateResponse(processedMessage, {
          targetLanguage: 'English',
          userLevel: currentLevel ? currentLevel.toString() : 'intermediate',
          focusArea: 'conversation',
          signal: controller.signal,
          complexity: complexity.complexity
        });
      } else {
        // Fallback to mock response if AI not ready
        response = await simulateAIResponse(processedMessage);
      }
      
      // Clear all timeouts and intervals
      timeouts.forEach(timeout => clearTimeout(timeout));
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      const responseTime = Date.now() - startTime;
      console.log(`Response generated in ${responseTime}ms for ${complexity.complexity} message`);
      
      // Update response statistics
      setResponseStats(prev => {
        const newTotalRequests = prev.totalRequests + 1;
        const newAverageTime = ((prev.averageTime * prev.totalRequests) + responseTime) / newTotalRequests;
        return {
          totalRequests: newTotalRequests,
          averageTime: Math.round(newAverageTime),
          fastestTime: Math.min(prev.fastestTime, responseTime),
          slowestTime: Math.max(prev.slowestTime, responseTime)
        };
      });
      
      // Add performance tip if response was slow
      let performanceTip = '';
      if (responseTime > 15000 && complexity.complexity === 'complex') {
        performanceTip = '\n\n💡 *Tip: For faster responses, try breaking complex questions into smaller, focused parts.*';
      } else if (responseTime > 10000 && complexity.complexity === 'moderate') {
        performanceTip = '\n\n💡 *Tip: Shorter, more specific questions typically get faster responses.*';
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response + performanceTip,
        timestamp: new Date(),
        responseTime: responseTime
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      setCurrentRequestController(null);
      setLoadingProgress(0);
      
      // Award XP based on message complexity
      const xpReward = complexity.complexity === 'simple' ? 5 : complexity.complexity === 'moderate' ? 10 : 15;
      addXP(xpReward, 'conversation');
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Provide specific error messages based on error type
      let errorContent = 'Sorry, I\'m having trouble responding right now. Please try again.';
      
      if (error.error === 'TIMEOUT') {
        errorContent = '⏱️ Response timed out. Your message might be too long or complex. Try breaking it into smaller parts or simplifying your question.';
      } else if (error.error === 'NETWORK_ERROR') {
        errorContent = '🌐 Network connection issue. Please check your internet connection and try again.';
      } else if (error.error === 'API_KEY_SUSPENDED') {
        errorContent = '🔧 AI service is temporarily unavailable. I\'ll try to help with a basic response instead.';
      } else if (error.error === 'PERMISSION_DENIED') {
        errorContent = '🔐 AI service access issue. Using fallback response to continue helping you.';
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      setCurrentRequestController(null);
      setLoadingProgress(0);
    }
  };

  const analyzeMessageComplexity = (message) => {
    const wordCount = message.split(/\s+/).length;
    const sentenceCount = message.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const hasQuestions = message.includes('?');
    const hasMultipleTopics = message.includes('and') || message.includes('also') || message.includes('additionally');
    
    let complexity = 'simple';
    if (wordCount > 50 || sentenceCount > 3 || hasMultipleTopics) {
      complexity = 'moderate';
    }
    if (wordCount > 100 || sentenceCount > 5) {
      complexity = 'complex';
    }
    
    return {
      complexity,
      wordCount,
      sentenceCount,
      hasQuestions,
      hasMultipleTopics,
      estimatedProcessingTime: complexity === 'simple' ? 3000 : complexity === 'moderate' ? 8000 : 15000
    };
  };

  const optimizeMessageForProcessing = (message) => {
    const analysis = analyzeMessageComplexity(message);
    
    if (analysis.complexity === 'complex') {
      // For complex messages, provide guidance
      console.log('Complex message detected:', analysis);
      
      if (message.length > 1000) {
        return {
          processedMessage: message.substring(0, 800) + '... [Message truncated for better processing]',
          userNotification: 'Your message was quite long, so I\'ve processed the main part. For best results, consider breaking complex questions into smaller parts.'
        };
      }
      
      if (analysis.hasMultipleTopics) {
        return {
          processedMessage: message,
          userNotification: 'I notice you\'re asking about multiple topics. I\'ll do my best to address them all, but feel free to ask follow-up questions for more detailed help.'
        };
      }
    }
    
    return {
      processedMessage: message,
      userNotification: null
    };
  };

  const simulateAIResponse = async (userMessage) => {
    const analysis = analyzeMessageComplexity(userMessage);
    // Simulate API delay based on complexity
    await new Promise(resolve => setTimeout(resolve, Math.min(analysis.estimatedProcessingTime * 0.3, 3000)));
    
    const responses = [
      "That's a great question! Let me help you with that.",
      "I understand what you're asking. Here's how I would explain it...",
      "Excellent! You're making good progress. Let's continue with...",
      "That's correct! Now, let's try something a bit more challenging.",
      "I can help you practice that. Would you like to try some examples?",
      "Good effort! Here's a tip to help you improve...",
      "Perfect! You're getting the hang of it. Let's move on to..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handleSpeakMessage = (content) => {
    speakText(content, { lang: 'en-US', rate: 0.9 });
  };

  const handleCancelRequest = () => {
    if (currentRequestController) {
      currentRequestController.abort();
      setIsLoading(false);
      setCurrentRequestController(null);
      setLoadingProgress(0);
      
      // Add a cancelled message
      const cancelMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: '❌ Request cancelled. Feel free to ask me something else!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cancelMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Allow Escape key to cancel ongoing requests
    if (e.key === 'Escape' && isLoading) {
      handleCancelRequest();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Chat Practice</h1>
              <p className="text-sm text-muted-foreground">Practice conversations with AI</p>
            </div>
          </div>
          
          {/* AI Status Indicator */}
          <div className="flex items-center space-x-4">
            {/* Gemini Status */}
            {isGeminiAvailable() && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-medium text-blue-700">Gemini</span>
              </div>
            )}
            
            {/* AI Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                aiStatus === 'ready' ? 'bg-green-500' :
                aiStatus === 'initializing' ? 'bg-yellow-500 animate-pulse' :
                aiStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className={getStatusColor()}>
                {getStatusMessage()}
              </span>
              {aiStatus === 'ready' && (
                <Zap className="w-3 h-3 text-green-500" />
              )}
            </div>
            
            {/* Performance Stats */}
            {responseStats.totalRequests > 0 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                <Zap className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">
                  Avg: {(responseStats.averageTime / 1000).toFixed(1)}s
                </span>
                <span className="text-xs text-green-600" title={`Total requests: ${responseStats.totalRequests}\nFastest: ${(responseStats.fastestTime / 1000).toFixed(1)}s\nSlowest: ${(responseStats.slowestTime / 1000).toFixed(1)}s`}>
                  ({responseStats.totalRequests})
                </span>
              </div>
            )}
            
            {/* Settings Button */}
            <button
              onClick={() => setShowGeminiSettings(!showGeminiSettings)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="AI Settings"
            >
              
            </button>
          </div>
        </div>
      </div>

      {/* Gemini Settings Panel */}
      {showGeminiSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-border p-4 bg-muted/30"
        >
          <GeminiSettings />
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-muted-foreground rounded-bl-md'
                }`}>
                  <div className="flex items-start space-x-2">
                    <p className="text-sm flex-1">{message.content}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${
                      message.type === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground/70'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.type === 'ai' && (
                      <button
                        onClick={() => handleSpeakMessage(message.content)}
                        className="ml-2 p-1 rounded hover:bg-accent transition-colors"
                        title="Listen to message"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Enhanced Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-start space-x-3 max-w-md">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 min-w-0 flex-1">
                <div className="flex items-center justify-between space-x-3">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {loadingMessage}
                    </span>
                  </div>
                  {currentRequestController && (
                     <button
                       onClick={handleCancelRequest}
                       className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                       title="Cancel request (or press Escape)"
                     >
                       Cancel
                     </button>
                   )}
                </div>
                {/* Progress bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  {loadingProgress < 100 ? `${Math.round(loadingProgress)}% complete` : 'Finalizing...'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 flex-shrink-0 bg-background">
        <div className="flex items-end space-x-3">
          {/* Voice Input Button */}
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-accent hover:bg-accent/80 text-accent-foreground'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                height: 'auto'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center justify-center space-x-2 text-red-500"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Chat;