import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, Bot, User, Loader2, Settings, BookOpen, Target, Zap } from 'lucide-react';
import { useAudio } from '../providers/AudioProvider';
import { useProgress } from '../providers/ProgressProvider';
import { useAI } from '../providers/AIProvider';

const EnhancedChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Welcome to Enhanced Chat! I can help you with grammar corrections, vocabulary suggestions, and pronunciation feedback. What would you like to practice?',
      timestamp: new Date(),
      features: {
        corrections: [],
        suggestions: [],
        difficulty: 'beginner'
      }
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState('conversation'); // conversation, grammar, vocabulary, pronunciation
  const { level: currentLevel } = useProgress();
  const [difficulty, setDifficulty] = useState(currentLevel ? currentLevel.toString() : 'intermediate');
  const [showSettings, setShowSettings] = useState(false);
  const { isRecording, startRecording, stopRecording, speakText } = useAudio();
  const { addXP } = useProgress();
  const {
    aiStatus,
    isReady,
    generateResponse,
    analyzeText,
    getStatusMessage,
    getStatusColor
  } = useAI();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeMessage = async (message) => {
    if (isReady) {
      try {
        // Use real AI analysis
        const analysis = await analyzeText(message);
        return analysis;
      } catch (error) {
        console.error('AI analysis failed, using fallback:', error);
      }
    }
    
    // Fallback analysis - simulate grammar and vocabulary analysis
    const corrections = [];
    const suggestions = [];
    const vocabulary = [];

    // Simple grammar check simulation
    if (message.toLowerCase().includes('i are')) {
      corrections.push({
        original: 'i are',
        corrected: 'I am',
        explanation: 'Use "I am" instead of "I are"'
      });
    }

    // Vocabulary suggestions
    if (message.toLowerCase().includes('good')) {
      suggestions.push({
        word: 'good',
        alternatives: ['excellent', 'wonderful', 'fantastic', 'outstanding'],
        level: 'intermediate'
      });
    }

    // Vocabulary identification
    const words = message.split(' ').filter(word => word.length > 4);
    words.forEach(word => {
      if (Math.random() > 0.7) { // Randomly identify some words as vocabulary
        vocabulary.push({
          word: word.toLowerCase(),
          definition: `Definition of ${word}`,
          level: difficulty
        });
      }
    });

    return { corrections, suggestions, vocabulary };
  };

  const generateAIResponse = async (userMessage, analysis) => {
    if (isReady) {
      try {
        // Use real AI for enhanced responses
        const response = await generateResponse(userMessage, {
          targetLanguage: 'English',
          userLevel: difficulty,
          focusArea: chatMode
        });
        return response;
      } catch (error) {
        console.error('AI response failed, using fallback:', error);
      }
    }
    
    // Fallback responses
    const responses = {
      conversation: [
        "That's interesting! Tell me more about that.",
        "I see what you mean. How do you feel about it?",
        "Great point! Have you considered this perspective?",
        "That's a thoughtful observation. What made you think of that?"
      ],
      grammar: [
        "Let me help you with the grammar in that sentence.",
        "Good effort! Here are some grammar improvements.",
        "Your grammar is improving! Let's work on these points.",
        "Nice try! Here's how to make it even better."
      ],
      vocabulary: [
        "Excellent vocabulary usage! Here are some alternatives.",
        "Good word choice! Let me suggest some synonyms.",
        "Your vocabulary is expanding! Try these advanced words.",
        "Great! Here are some related words to learn."
      ],
      pronunciation: [
        "Let's work on pronunciation for those words.",
        "Good attempt! Here's how to improve your pronunciation.",
        "Your pronunciation is getting better! Focus on these sounds.",
        "Nice work! Let's practice these challenging sounds."
      ]
    };

    let response = responses[chatMode][Math.floor(Math.random() * responses[chatMode].length)];

    // Add specific feedback based on analysis
    if (analysis?.corrections && Array.isArray(analysis.corrections) && analysis.corrections.length > 0) {
      response += ` I noticed: ${analysis.corrections[0]?.explanation || ''}`;
    }

    if (chatMode === 'vocabulary') {
      const firstSuggestion = Array.isArray(analysis?.suggestions) && analysis.suggestions.length > 0
        ? analysis.suggestions[0]
        : null;
      const altList = Array.isArray(firstSuggestion?.alternatives)
        ? firstSuggestion.alternatives.slice(0, 2).join(', ')
        : null;
      if (firstSuggestion && altList) {
        response += ` Instead of "${firstSuggestion.word}", you could try: ${altList}.`;
      }
    }

    return response;
  };

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const analysis = await analyzeMessage(message.trim());
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
      analysis
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
      
      const response = await generateAIResponse(message.trim(), analysis);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response,
        timestamp: new Date(),
        features: {
          corrections: analysis?.corrections || [],
          suggestions: analysis?.suggestions || [],
          vocabulary: analysis?.vocabulary || [],
          difficulty
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Award XP based on mode and analysis
      let xpAmount = 15;
      if (analysis?.corrections && Array.isArray(analysis.corrections) && analysis.corrections.length > 0) xpAmount += 5;
      if (analysis?.vocabulary && Array.isArray(analysis.vocabulary) && analysis.vocabulary.length > 0) xpAmount += 10;
      
      addXP(xpAmount, chatMode);
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I\'m having trouble analyzing your message right now. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const modeIcons = {
    conversation: Bot,
    grammar: BookOpen,
    vocabulary: Target,
    pronunciation: Volume2
  };

  const ModeIcon = modeIcons[chatMode];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden p-4 flex-shrink-0 rounded-xl bg-white/40 backdrop-blur-xl ring-1 ring-white/60 shadow-lg">
        <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br from-violet-200/40 via-sky-200/30 to-pink-200/40" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <ModeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Enhanced Chat</h1>
              <p className="text-sm text-muted-foreground">
                {chatMode.charAt(0).toUpperCase() + chatMode.slice(1)} practice • {difficulty} level
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-white/40 backdrop-blur-xl ring-1 ring-white/60 shadow-md"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chat Mode */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Chat Mode</label>
                  <select
                    value={chatMode}
                    onChange={(e) => setChatMode(e.target.value)}
                    className="w-full p-2 rounded-xl ring-1 ring-white/60 bg-white/60 backdrop-blur-sm shadow-sm"
                  >
                    <option value="conversation">General Conversation</option>
                    <option value="grammar">Grammar Focus</option>
                    <option value="vocabulary">Vocabulary Building</option>
                    <option value="pronunciation">Pronunciation Practice</option>
                  </select>
                </div>

                {/* Difficulty Level */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-2 rounded-xl ring-1 ring-white/60 bg-white/60 backdrop-blur-sm shadow-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <div className="pointer-events-none absolute inset-0 opacity-60 bg-gradient-to-b from-transparent via-indigo-50/50 to-transparent" />
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
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <ModeIcon className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2">
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ring-1 ${
                    message.type === 'user'
                      ? 'bg-white/70 backdrop-blur-md ring-white/60 text-gray-900 rounded-br-md'
                      : 'bg-white/60 backdrop-blur-md ring-white/60 text-gray-700 rounded-bl-md'
                  }`}>
                    <p className="text-sm">{message.content}</p>
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
                          className="ml-2 p-1 rounded hover:bg-black/5 transition-colors"
                          title="Listen to message"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Analysis Results */}
                  {message.analysis && (
                    <div className="space-y-2">
                      {/* Grammar Corrections */}
                      {message.analysis.corrections?.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Grammar Corrections</h4>
                          {message.analysis.corrections.map((correction, index) => (
                            <div key={index} className="text-xs text-red-600 dark:text-red-400">
                              <span className="line-through">{correction?.original || 'Original text'}</span> → <span className="font-medium">{correction?.corrected || 'Corrected text'}</span>
                              <p className="text-red-500 dark:text-red-400 mt-1">{correction?.explanation || 'No explanation available'}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Vocabulary Suggestions */}
                      {message.analysis.suggestions?.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Vocabulary Suggestions</h4>
                          {message.analysis.suggestions.map((suggestion, index) => (
                            <div key={index} className="text-xs text-blue-600 dark:text-blue-400">
                              <span className="font-medium">{suggestion?.word || 'Unknown word'}</span> → {
                                Array.isArray(suggestion?.alternatives)
                                  ? suggestion.alternatives.join(', ')
                                  : (typeof suggestion?.alternatives === 'string' && suggestion.alternatives.trim().length > 0)
                                    ? suggestion.alternatives
                                    : 'No alternatives available'
                              }
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Vocabulary Learning */}
                      {message.analysis.vocabulary?.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Vocabulary</h4>
                          {message.analysis.vocabulary.map((vocab, index) => (
                            <div key={index} className="text-xs text-green-600 dark:text-green-400">
                              <span className="font-medium">{vocab?.word || 'Unknown word'}</span> - {vocab?.definition || 'No definition available'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Features */}
                  {message.features && (
                    <div className="space-y-2">
                      {message.features.corrections?.length > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">Feedback</h4>
                          {message.features.corrections.map((correction, index) => (
                            <div key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                              {correction.explanation}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-start space-x-3 max-w-xs">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <ModeIcon className="w-4 h-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/60 backdrop-blur-md ring-1 ring-white/60 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative p-4 flex-shrink-0 rounded-xl bg-white/40 backdrop-blur-xl ring-1 ring-white/60 shadow-lg">
        <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br from-blue-200/40 via-teal-200/30 to-purple-200/40" />
        <div className="flex items-end space-x-3">
          {/* Voice Input Button */}
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-white/60 ring-1 ring-white/60 backdrop-blur-sm text-gray-900 hover:bg-white/70 shadow-sm'
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
              placeholder={`Type your message for ${chatMode} practice...`}
              className="w-full resize-none rounded-xl ring-1 ring-white/60 bg-white/60 backdrop-blur-sm shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
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
            className="p-3 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-white/60 text-gray-900 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative shadow-sm"
            title="Send message"
          >
            <Send className="w-5 h-5" />
            {chatMode !== 'conversation' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
            )}
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
            <span className="text-sm font-medium">Recording for {chatMode} analysis...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChat;