import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, Bot, User, Loader2, Zap, Sparkles, ThumbsUp, ThumbsDown, Plus, MessageSquare, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAudio } from '../providers/AudioProvider';
import { useProgress } from '../providers/ProgressProvider';
import { useAI } from '../providers/AIProvider';
import { useAuth } from '../contexts/AuthContext';
import GeminiSettings from '../components/ui/GeminiSettings';
import supabaseService from "../services/supabaseService.js";

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your language learning assistant. How can I help you practice today?',
      timestamp: new Date(),
      reaction: null
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);
  const [currentRequestController, setCurrentRequestController] = useState(null);
  const [responseStats, setResponseStats] = useState({ totalRequests: 0, averageTime: 0, fastestTime: Infinity, slowestTime: 0 });
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Hover peek when collapsed
  const [isHoverPeek, setIsHoverPeek] = useState(false);
  // Mobile slide-over state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Persist collapse state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatSidebarCollapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('chatSidebarCollapsed', String(isSidebarCollapsed));
    } catch (e) {
      // ignore storage errors
    }
  }, [isSidebarCollapsed]);
  
  // Keyboard shortcut: Ctrl+B toggles sidebar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  
  // Toggle handler
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const messageChannelRef = useRef(null);
  const messagesRef = useRef(messages);
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
    getCurrentSessionId,
    setCurrentSessionIdDirect,
    loadConversationFromMessages
  } = useAI();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
    // Do not auto-create sessions. If an existing session id is present, select it.
    if (!isReady) return;
    const existingId = getCurrentSessionId && getCurrentSessionId();
    if (existingId && existingId !== selectedSessionId) {
      setSelectedSessionId(existingId);
    }
  }, [isReady, getCurrentSessionId, selectedSessionId]);

  useEffect(() => {
    // Load sessions from Supabase when user is available
    const loadSessions = async () => {
      if (!supabaseService.isConnected || !user?.id) return;
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const { success, data, error } = await supabaseService.listChatSessions(user.id, 100);
        if (success) {
          setSessions(data || []);
        } else {
          setSessionsError(error || 'Failed to load chat history');
        }
      } catch (e) {
        setSessionsError(e?.message || 'Failed to load chat history');
      } finally {
        setSessionsLoading(false);
      }
    };
    loadSessions();
  }, [user]);

  // Keep a live reference of messages for deduplication in realtime handler
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Cleanup realtime channel on unmount
  useEffect(() => {
    return () => {
      if (messageChannelRef.current) {
        supabaseService.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, []);

  const openSession = async (session) => {
    setSelectedSessionId(session.id);
    setCurrentSessionIdDirect(session.id);

    // Tear down any previous realtime subscription
    if (messageChannelRef.current) {
      supabaseService.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }

    // Fetch messages for this session from Supabase and load into UI + provider
    if (supabaseService.isConnected) {
      try {
        const { success, data } = await supabaseService.getChatMessages(session.id);
        if (success) {
          // Map messages to UI structure (support both legacy and current schema)
          const mapped = (data || []).map(m => {
            const role = m?.message_type || m?.role || (m?.is_user ? 'user' : 'assistant');
            return {
              id: m.id,
              type: role === 'user' ? 'user' : 'ai',
              content: m?.content || m?.message || '',
              timestamp: new Date(m.created_at),
              reaction: null
            };
          });
          setMessages(mapped.length > 0 ? mapped : [
            {
              id: Date.now(),
              type: 'ai',
              content: 'Welcome back! Continue your practice.',
              timestamp: new Date(),
              reaction: null
            }
          ]);
          loadConversationFromMessages(data || []);

          // Subscribe to new messages for this session (dedup by content/time)
          const ch = supabaseService.subscribeToSessionMessages(session.id, (row) => {
            if (!row) return;
            const type = (row?.message_type || row?.role) === 'user' ? 'user' : 'ai';
            const createdAt = new Date(row.created_at);
            const content = row?.content || '';
            const exists = (messagesRef.current || []).some(m => m.type === type && m.content === content && Math.abs(m.timestamp.getTime() - createdAt.getTime()) < 8000);
            if (exists) return;
            setMessages(prev => [...prev, { id: row.id, type, content, timestamp: createdAt, reaction: null }]);
          });
          messageChannelRef.current = ch;
        }
      } catch (e) {
        console.warn('Failed to load session messages:', e?.message || e);
      }
    }
  };

  const createNewChat = async () => {
    const newId = await startNewSession();
    setSelectedSessionId(newId);
    setMessages([
      {
        id: Date.now(),
        type: 'ai',
        content: 'New chat started. How can I help you today?',
        timestamp: new Date(),
        reaction: null
      }
    ]);
    // Refresh sessions list
    if (supabaseService.isConnected && user?.id) {
      const { success, data } = await supabaseService.listChatSessions(user.id, 100);
      if (success) setSessions(data || []);
    }
    // Ensure realtime subscription is attached to the new session
    openSession({ id: newId });
  };

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const startTime = Date.now();
    const trimmedMessage = message.trim();
    
    // Ensure we have a session id for saving
    let sessionId = getCurrentSessionId();
    if (!sessionId) {
      sessionId = await startNewSession();
      setSelectedSessionId(sessionId);
      setCurrentSessionIdDirect(sessionId);
    }

    // Analyze and optimize message
    const optimization = optimizeMessageForProcessing(trimmedMessage);
    const { processedMessage, userNotification } = optimization;
    const complexity = analyzeMessageComplexity(trimmedMessage);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmedMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Persist user message to Supabase
    if (supabaseService.isConnected && user?.id && sessionId) {
      try {
        await supabaseService.saveChatMessage({
          sessionId,
          userId: user.id,
          role: 'user',
          content: trimmedMessage,
          metadata: { complexity: complexity.complexity }
        });
        // Update sessions list ordering
        const { success, data } = await supabaseService.listChatSessions(user.id, 100);
        if (success) setSessions(data || []);
      } catch (e) {
        console.warn('Failed to persist user message:', e?.message || e);
      }
    }
    
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
      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingMessage('Analyzing your message...');
      
      const controller = new AbortController();
      setCurrentRequestController(controller);
      
      const progressUpdateInterval = complexity.complexity === 'simple' ? 800 : complexity.complexity === 'moderate' ? 1200 : 1500;
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * (complexity.complexity === 'simple' ? 20 : 12);
        });
      }, progressUpdateInterval);
      
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
        console.log('Calling generateResponse with:', processedMessage);
        response = await generateResponse(processedMessage, {
          targetLanguage: 'English',
          userLevel: currentLevel ? currentLevel.toString() : 'intermediate',
          focusArea: 'conversation',
          signal: controller.signal,
          complexity: complexity.complexity
        });
        console.log('Received response from generateResponse:', response);
      } else {
        console.log('AI not ready, using mock response');
        response = await simulateAIResponse(processedMessage);
        console.log('Mock response:', response);
      }
      
      timeouts.forEach(timeout => clearTimeout(timeout));
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      const responseTime = Date.now() - startTime;
      console.log(`Response generated in ${responseTime}ms for ${complexity.complexity} message`);
      
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
        responseTime: responseTime,
        reaction: null
      };

      console.log('Adding AI message to chat:', aiMessage);
      setMessages(prev => {
        const newMessages = [...prev, aiMessage];
        console.log('Updated messages array:', newMessages);
        return newMessages;
      });

      // Persist assistant message to Supabase as soon as it’s generated
      if (supabaseService.isConnected && user?.id && sessionId) {
        try {
          await supabaseService.saveChatMessage({
            sessionId,
            userId: user.id,
            role: 'assistant',
            content: aiMessage.content,
            metadata: { complexity: complexity.complexity }
          });
        } catch (e) {
          console.warn('Failed to persist assistant message:', e?.message || e);
        }
      }

      setIsLoading(false);
      setCurrentRequestController(null);
      setLoadingProgress(0);
      
      const xpReward = complexity.complexity === 'simple' ? 5 : complexity.complexity === 'moderate' ? 10 : 15;
      addXP(xpReward, 'conversation');
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
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
        timestamp: new Date(),
        reaction: null
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

  const handleRenameSession = async (e, session) => {
    e.stopPropagation();
    const input = window.prompt('Enter chat name', session.title || 'New Chat');
    if (input === null) return; // cancelled
    const title = input.trim();
    if (!title) return;
    const res = await supabaseService.renameChatSession(session.id, title);
    if (!res?.success) { alert('Rename failed: ' + (res?.error || '')); return; }
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title } : s));
  };

  const handleDeleteSession = async (e, session) => {
    e.stopPropagation();
    const ok = window.confirm('This chat and all its messages will be permanently deleted. Continue?');
    if (!ok) return;
    const res = await supabaseService.deleteChatSession(session.id);
    if (!res?.success) { alert('Delete failed: ' + (res?.error || '')); return; }
    setSessions(prev => prev.filter(s => s.id !== session.id));
    if (selectedSessionId === session.id) {
      if (messageChannelRef.current) {
        supabaseService.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      setSelectedSessionId(null);
      setCurrentSessionIdDirect(null);
      setMessages([]);
    }
  };

  const persistReaction = async (messageId, nextReaction, messageContent) => {
    try {
      const sessionId = getCurrentSessionId ? getCurrentSessionId() : null;
      const userId = await supabaseService.getOrCreateUserProfileId();
      const result = await supabaseService.saveChatReaction({
        userId,
        sessionId,
        messageId,
        reaction: nextReaction,
        messageContent,
      });
      if (!result?.success) {
        console.warn("Failed to save reaction:", result?.error);
      }
    } catch (e) {
      console.warn("Reaction persistence error:", e?.message || e);
    }
  };

  const handleReaction = async (messageId, reaction) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || m.type !== 'ai') return m;
      const next = m.reaction === reaction ? null : reaction;
      return { ...m, reaction: next };
    }));
  };

  const handleCancelRequest = () => {
    if (currentRequestController) {
      currentRequestController.abort();
      setIsLoading(false);
      setCurrentRequestController(null);
      setLoadingProgress(0);
      
      const cancelMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: '❌ Request cancelled. Feel free to ask me something else!',
        timestamp: new Date(),
        reaction: null
      };
      setMessages(prev => [...prev, cancelMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape' && isLoading) {
      handleCancelRequest();
    }
  };

  return (
    <div className="flex h-screen ios-page">
      {/* Sidebar - iOS-like chat history (desktop and tablets) */}
      <aside className={`${isSidebarCollapsed ? 'w-[56px]' : 'w-[320px]'} sticky top-0 h-screen flex-shrink-0 bg-white border-r border-slate-200/70 transition-all duration-300 overflow-hidden flex flex-col hidden md:flex`}> 
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={toggleSidebar} className="p-1.5 rounded-full hover:bg-slate-100" title={isSidebarCollapsed ? 'Expand' : 'Collapse'}>
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-700" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              )}
            </button>
            {!isSidebarCollapsed && (
              <>
                <MessageSquare className="w-5 h-5 text-slate-700" />
                <span className="text-base font-semibold">Chats</span>
              </>
            )}
          </div>
          {!isSidebarCollapsed ? (
            <button onClick={createNewChat} className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1">
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          ) : (
            <button onClick={createNewChat} className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="New">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className="px-2 flex-1 overflow-y-auto">
            {sessionsLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading history...</div>
            ) : sessionsError ? (
              <div className="p-3 text-sm text-red-600">{sessionsError}</div>
            ) : (
              <div className="space-y-1">
                {(sessions || []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSession(s)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedSessionId === s.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'} `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{s.title || 'New Chat'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{new Date(s.last_message_at).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => handleRenameSession(e, s)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(e, s)}
                          className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
                {(!sessions || sessions.length === 0) && (
                  <div className="p-3 text-sm text-muted-foreground">No history yet. Start a new chat!</div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col h-full flex-1">
        {/* Header */}
        <div className="ios-header p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile: open history */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-100 md:hidden"
                title="Open chats"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
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
               {isGeminiAvailable() && (
                 <div className="flex items-center space-x-1 px-2 py-1 bg-white/70 backdrop-blur-sm rounded-full border border-slate-200">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium text-slate-700">Gemini</span>
                 </div>
               )}
               
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
               
               {responseStats.totalRequests > 0 && (
                 <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                   <Zap className="w-3 h-3 text-green-600" />
                   <span className="text-xs font-medium text-green-700">
                     Avg: {(responseStats.averageTime / 1000).toFixed(1)}s
                   </span>
                   <span className="text-xs text-green-600" title={"Total requests: " + responseStats.totalRequests + ", Fastest: " + (responseStats.fastestTime / 1000).toFixed(1) + "s, Slowest: " + (responseStats.slowestTime / 1000).toFixed(1) + "s"}>
                     ({responseStats.totalRequests})
                   </span>
                 </div>
               )}
               
               <button
                 onClick={() => setShowGeminiSettings(!showGeminiSettings)}
                 className="p-2 hover:bg-accent rounded-lg transition-colors"
                 title="AI Settings"
               >
                 
               </button>
             </div>
           </div>
        </div>

        {showGeminiSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-premium no-hover-motion shadow-soft p-4 rounded-xl"
          >
            <GeminiSettings />
          </motion.div>
        )}

        {/* Messages */}
        <div className="ios-chat-area flex-1 overflow-y-auto">
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
                  <div className="ios-avatar flex-shrink-0">
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div className={`ios-bubble ${message.type === 'user' ? 'ios-bubble-user' : 'ios-bubble-ai'}`}>
                    <div className="flex items-start space-x-2">
                      <p className="text-sm flex-1">{message.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs ios-timestamp">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.type === 'ai' ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 mr-1">
                            <button
                              onClick={() => handleReaction(message.id, 'like')}
                              className={`p-1 rounded transition-colors transition-transform hover:bg-black/5 active:scale-95 ${
                                message.reaction === "like"
                                  ? "text-blue-600 opacity-100"
                                  : message.reaction === "dislike"
                                  ? "opacity-40 text-muted-foreground"
                                  : "text-muted-foreground opacity-80"
                              }`}
                            >
                              <ThumbsUp
                                className={`w-3 h-3 ${message.reaction === "like" ? "scale-105" : ""}`}
                                strokeWidth={message.reaction === "like" ? 2.5 : 2}
                              />
                            </button>
                            <button
                              onClick={() => handleReaction(message.id, 'dislike')}
                              className={`p-1 rounded transition-colors transition-transform hover:bg-black/5 active:scale-95 ${
                                message.reaction === "dislike"
                                  ? "text-red-600 opacity-100"
                                  : message.reaction === "like"
                                  ? "opacity-40 text-muted-foreground"
                                  : "text-muted-foreground opacity-80"
                              }`}
                            >
                              <ThumbsDown
                                className={`w-3 h-3 ${message.reaction === "dislike" ? "scale-105" : ""}`}
                                strokeWidth={message.reaction === "dislike" ? 2.5 : 2}
                              />
                            </button>
                          </div>
                          <button
                            onClick={() => handleSpeakMessage(message.content)}
                            className="p-1 rounded hover:bg-black/5 transition-colors"
                            title="Listen to message"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

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
                <div className="ios-bubble ios-bubble-ai min-w-0 flex-1">
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
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
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

        {/* Composer */}
        <div className="ios-composer">
          <div className="ios-input-wrap">
            <div className="ios-input-field">
              <button
                onClick={handleVoiceInput}
                className={`ios-voice-button ${isRecording ? 'bg-red-500 text-white animate-pulse' : ''}`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="ios-textarea"
                rows={1}
                style={{
                  minHeight: '44px',
                  maxHeight: '140px',
                  height: 'auto'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                }}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="ios-send-button"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

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
      {/* Mobile slide-over for chat history */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              key="mb-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.aside
              key="mb-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-[360px] bg-white border-r border-slate-200/70 shadow-xl flex flex-col md:hidden"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-slate-700" />
                  <span className="text-base font-semibold">Chats</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={createNewChat} className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1">
                    <Plus className="w-4 h-4" />
                    <span>New</span>
                  </button>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close chats">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="px-2 flex-1 overflow-y-auto">
                {sessionsLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Loading history...</div>
                ) : sessionsError ? (
                  <div className="p-3 text-sm text-red-600">{sessionsError}</div>
                ) : (
                  <div className="space-y-1">
                    {(sessions || []).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { openSession(s); setIsMobileSidebarOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedSessionId === s.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'} `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-800">{s.title || 'New Chat'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{new Date(s.last_message_at).toLocaleDateString()}</span>
                            <button
                              onClick={(e) => { handleRenameSession(e, s); }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { handleDeleteSession(e, s); }}
                              className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </button>
                    ))}
                    {(!sessions || sessions.length === 0) && (
                      <div className="p-3 text-sm text-muted-foreground">No history yet. Start a new chat!</div>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;