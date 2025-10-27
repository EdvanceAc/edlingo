import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, Bot, User, Loader2, Zap, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAudio } from '../providers/AudioProvider';
import { useProgress } from '../providers/ProgressProvider';
import { useAI } from '../providers/AIProvider';
import supabaseService from "../services/supabaseService.js";

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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [currentRequestController, setCurrentRequestController] = useState(null);
  const [responseStats, setResponseStats] = useState({ totalRequests: 0, averageTime: 0, fastestTime: Infinity, slowestTime: 0 });
  const [chatMode, setChatMode] = useState('conversation'); // conversation, grammar, vocabulary, pronunciation
  const { level: currentLevel } = useProgress();
  const [difficulty, setDifficulty] = useState(currentLevel ? currentLevel.toString() : 'intermediate');
  const { isRecording, startRecording, stopRecording, speakText } = useAudio();
  const { addXP } = useProgress();
  const {
    aiStatus,
    isReady,
    generateResponse,
    analyzeText,
    getStatusMessage,
    getStatusColor,
    startNewSession,
    getCurrentSessionId,
    setCurrentSessionIdDirect,
    loadConversationFromMessages
  } = useAI();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messageChannelRef = useRef(null);
  const messagesRef = useRef(messages);

  // History sidebar state
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    try { const saved = localStorage.getItem('chatSidebarCollapsed'); if (saved !== null) setIsSidebarCollapsed(saved === 'true'); } catch (_) {}
  }, []);
  useEffect(() => { try { localStorage.setItem('chatSidebarCollapsed', String(isSidebarCollapsed)); } catch (_) {} }, [isSidebarCollapsed]);
  useEffect(() => {
    return () => {
      if (messageChannelRef.current) {
        supabaseService.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, []);

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      if (!supabaseService.isConnected) return;
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const { success, user } = await supabaseService.getCurrentUser();
        const userId = user?.id;
        if (!success || !userId) { setSessionsLoading(false); return; }
        const res = await supabaseService.listEnhancedSessions(userId, 100);
        if (res.success) setSessions(res.data || []); else setSessionsError(res.error || 'Failed to load chat history');
      } catch (e) {
        setSessionsError(e?.message || 'Failed to load chat history');
      } finally { setSessionsLoading(false); }
    };
    loadSessions();
  }, []);

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
    const corrections = [];
    const suggestions = [];
    const vocabulary = [];
    if (message.toLowerCase().includes('i are')) {
      corrections.push({ original: 'i are', corrected: 'I am', explanation: 'Use "I am" instead of "I are"' });
    }
    if (message.toLowerCase().includes('good')) {
      suggestions.push({ word: 'good', alternatives: ['excellent','wonderful','fantastic','outstanding'], level: 'intermediate' });
    }
    const words = message.split(' ').filter(word => word.length > 4);
    words.forEach(word => { if (Math.random() > 0.7) { vocabulary.push({ word: word.toLowerCase(), definition: `Definition of ${word}`, level: difficulty }); } });
    return { corrections, suggestions, vocabulary };
  };

  const openSession = async (session) => {
    setSelectedSessionId(session.id);
    setCurrentSessionIdDirect(session.id);
    if (messageChannelRef.current) { supabaseService.removeChannel(messageChannelRef.current); messageChannelRef.current = null; }
    if (supabaseService.isConnected) {
      try {
        const { success, data } = await supabaseService.getEnhancedMessages(session.id);
        if (success) {
          const mapped = (data || []).map(m => {
            const role = m?.message_type || m?.role || (m?.is_user ? 'user' : 'assistant');
            return { id: m.id, type: role === 'user' ? 'user' : 'ai', content: m?.content || m?.message || '', timestamp: new Date(m.created_at) };
          });
          setMessages(mapped.length > 0 ? mapped : [
            {
              id: Date.now(),
              type: 'ai',
              content: 'New enhanced chat started. What would you like to practice?',
              timestamp: new Date()
            }
          ]);
          loadConversationFromMessages(data || []);
          const ch = supabaseService.subscribeToEnhancedMessages(session.id, (row) => {
            if (!row) return;
            const type = (row?.message_type || row?.role) === 'user' ? 'user' : 'ai';
            const createdAt = new Date(row.created_at);
            const content = row?.content || '';
            const exists = (messagesRef.current || []).some(m => m.type === type && m.content === content && Math.abs(m.timestamp.getTime() - createdAt.getTime()) < 8000);
            if (exists) return;
            setMessages(prev => [...prev, { id: row.id, type, content, timestamp: createdAt }]);
          });
          messageChannelRef.current = ch;
        }
      } catch (e) { console.warn('Failed to load session messages:', e?.message || e); }
    }
  };

  const createNewChat = async () => {
    let newId = null;
    if (supabaseService.isConnected) {
      const { success, user } = await supabaseService.getCurrentUser();
      if (success && user?.id) {
        const created = await supabaseService.createEnhancedSession(user.id);
        if (created?.success && created?.data?.id) newId = created.data.id;
      }
    }
    if (!newId) newId = await startNewSession();
    setSelectedSessionId(newId);
    setMessages([{ id: Date.now(), type: 'ai', content: 'New enhanced chat started. What would you like to practice?', timestamp: new Date() }]);
    if (supabaseService.isConnected) {
      const { success, user } = await supabaseService.getCurrentUser();
      if (success && user?.id) {
        const { success: ok, data } = await supabaseService.listEnhancedSessions(user.id, 100);
        if (ok) setSessions(data || []);
      }
    }
    openSession({ id: newId });
  };

  const generateAIResponse = async (userMessage, analysis) => {
    if (isReady) {
      try {
        const response = await generateResponse(userMessage, { targetLanguage: 'English', userLevel: difficulty, focusArea: chatMode });
        return response;
      } catch (error) { console.error('AI response failed, using fallback:', error); }
    }
    const responses = {
      conversation: ["That's interesting! Tell me more about that.","I see what you mean. How do you feel about it?","Great point! Have you considered this perspective?","That's a thoughtful observation. What made you think of that?"],
      grammar: ["Let me help you with the grammar in that sentence.","Good effort! Here are some grammar improvements.","Your grammar is improving! Let's work on these points.","Nice try! Here's how to make it even better."],
      vocabulary: ["Excellent vocabulary usage! Here are some alternatives.","Good word choice! Let me suggest some synonyms.","Your vocabulary is expanding! Try these advanced words.","Great! Here are some related words to learn."],
      pronunciation: ["Let's work on pronunciation for those words.","Good attempt! Here's how to improve your pronunciation.","Your pronunciation is getting better! Focus on these sounds.","Nice work! Let's practice these challenging sounds."]
    };
    let response = responses[chatMode][Math.floor(Math.random() * responses[chatMode].length)];
    if (analysis?.corrections && Array.isArray(analysis.corrections) && analysis.corrections.length > 0) { response += ` I noticed: ${analysis.corrections[0]?.explanation || ''}`; }
    const firstSuggestion = Array.isArray(analysis?.suggestions) && analysis.suggestions.length > 0 ? analysis.suggestions[0] : null;
    const altList = Array.isArray(firstSuggestion?.alternatives) ? firstSuggestion.alternatives.slice(0, 2).join(', ') : null;
    if (chatMode === 'vocabulary' && firstSuggestion && altList) { response += ` Instead of "${firstSuggestion.word}", you could try: ${altList}.`; }
    return response;
  };

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;
    const analysis = await analyzeMessage(message.trim());
    let sessionId = getCurrentSessionId && getCurrentSessionId();
    if (!sessionId) { sessionId = await startNewSession(); setSelectedSessionId(sessionId); setCurrentSessionIdDirect(sessionId); }
    const userMessageObj = { id: Date.now(), type: 'user', content: message.trim(), timestamp: new Date(), analysis };
    setMessages(prev => [...prev, userMessageObj]);
    setInputMessage('');
    setIsLoading(true);

    if (supabaseService.isConnected) {
      try {
        const { success, user } = await supabaseService.getCurrentUser();
        if (success && user?.id && sessionId) {
          const res = await supabaseService.saveEnhancedMessage({ sessionId, userId: user.id, role: 'user', content: message.trim(), metadata: { mode: chatMode, difficulty } });
          if (res?.success && res?.data?.id) { setMessages(prev => prev.map(m => (m.id === userMessageObj.id ? { ...m, id: res.data.id } : m))); }
          const list = await supabaseService.listEnhancedSessions(user.id, 100); if (list.success) setSessions(list.data || []);
        }
      } catch (e) { console.warn('EnhancedChat: persist user message failed:', e?.message || e); }
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
      const response = await generateAIResponse(message.trim(), analysis);
      const aiMessage = { id: Date.now() + 1, type: 'ai', content: response, timestamp: new Date(), features: { corrections: analysis?.corrections || [], suggestions: analysis?.suggestions || [], vocabulary: analysis?.vocabulary || [], difficulty } };
      setMessages(prev => [...prev, aiMessage]);
      if (supabaseService.isConnected) {
        try {
          const { success, user } = await supabaseService.getCurrentUser();
          const sid = getCurrentSessionId && getCurrentSessionId();
          if (success && user?.id && sid) {
            const res = await supabaseService.saveEnhancedMessage({ sessionId: sid, userId: user.id, role: 'assistant', content: response, metadata: { mode: chatMode, difficulty } });
            if (res?.success && res?.data?.id) { setMessages(prev => prev.map(m => (m.id === aiMessage.id ? { ...m, id: res.data.id } : m))); }
          }
        } catch (e) { console.warn('EnhancedChat: persist assistant message failed:', e?.message || e); }
      }
      let xpAmount = 15; if (analysis?.corrections?.length) xpAmount += 5; if (analysis?.vocabulary?.length) xpAmount += 10; addXP(xpAmount, chatMode);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = { id: Date.now() + 1, type: 'ai', content: 'Sorry, I\'m having trouble analyzing your message right now. Please try again.', timestamp: new Date() };
      setMessages(prev => [...prev, errorMessage]);
    } finally { setIsLoading(false); }
  };

  const handleVoiceInput = async () => { if (isRecording) { stopRecording(); } else { try { await startRecording(); } catch (error) { console.error('Failed to start recording:', error); } } };
  const handleSpeakMessage = (content) => { speakText(content, { lang: 'en-US', rate: 0.9 }); };
  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  // Unified icon for avatars (to match Chat bubble visuals)
  const ModeIcon = Bot;
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <>
    <div className="flex h-screen ios-page">
      <aside className={`${isSidebarCollapsed ? 'w-[56px]' : 'w-[320px]'} sticky top-0 h-screen z-[30] flex-shrink-0 bg-white border-r border-slate-200/70 transition-all duration-300 overflow-hidden flex flex-col hidden md:flex`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={toggleSidebar} className="p-1.5 rounded-full hover:bg-slate-100" title={isSidebarCollapsed ? 'Expand' : 'Collapse'}>
              {isSidebarCollapsed ? (<ChevronRight className="w-4 h-4 text-slate-700" />) : (<ChevronLeft className="w-4 h-4 text-slate-700" />)}
            </button>
            {!isSidebarCollapsed && (<><MessageSquare className="w-5 h-5 text-slate-700" /><span className="text-base font-semibold">Chats History</span></>)}
          </div>
          {!isSidebarCollapsed ? (
            <button onClick={createNewChat} className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"><Plus className="w-4 h-4" /><span>New</span></button>
          ) : (
            <button onClick={createNewChat} className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="New"><Plus className="w-4 h-4" /></button>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className="px-2 flex-1 overflow-y-auto ios-scrollbar" style={{ paddingBottom: 'max(var(--bottom-nav-height, 0px), env(safe-area-inset-bottom))' }}>
            {sessionsLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading history...</div>
            ) : sessionsError ? (
              <div className="p-3 text-sm text-red-600">{sessionsError}</div>
            ) : (
              <div className="space-y-1">
                {(sessions || []).map((s) => (
                  <button key={s.id} onClick={() => openSession(s)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedSessionId === s.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'} `}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{s.title || 'New Chat'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{new Date(s.last_message_at).toLocaleDateString()}</span>
                        <button onClick={(e) => { e.stopPropagation(); const t = window.prompt('Enter chat name', s.title || 'New Chat'); if (!t) return; supabaseService.renameEnhancedSession(s.id, t).then(r => { if (r?.success) setSessions(prev => prev.map(x => x.id === s.id ? { ...x, title: t } : x)); }); }} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); const ok = window.confirm('Delete this chat?'); if (!ok) return; supabaseService.deleteEnhancedSession(s.id).then(r => { if (r?.success) setSessions(prev => prev.filter(x => x.id !== s.id)); }); }} className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </button>
                ))}
                {(!sessions || sessions.length === 0) && (<div className="p-3 text-sm text-muted-foreground">No history yet. Start a new chat!</div>)}
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col">
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
                <h1 className="text-xl font-semibold">Enhanced Chat</h1>
                <p className="text-sm text-muted-foreground">Practice conversations with AI</p>
              </div>
            </div>
            {/* AI Status (match Chat) */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 px-2 py-1 bg-white/70 backdrop-blur-sm rounded-full border border-slate-200">
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-medium text-slate-700">Gemini</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${aiStatus === 'ready' ? 'bg-green-500' : aiStatus === 'initializing' ? 'bg-yellow-500 animate-pulse' : aiStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-slate-700">{getStatusMessage()}</span>
                {aiStatus === 'ready' && (<Zap className="w-3 h-3 text-green-500" />)}
              </div>
              {responseStats.totalRequests > 0 && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                  <Zap className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Avg: {(responseStats.averageTime / 1000).toFixed(1)}s</span>
                  <span className="text-xs text-green-600" title={`Total requests: ${responseStats.totalRequests}, Fastest: ${(responseStats.fastestTime / 1000).toFixed(1)}s, Slowest: ${(responseStats.slowestTime / 1000).toFixed(1)}s`}>
                    ({responseStats.totalRequests})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="ios-chat-area flex-1 overflow-y-auto ios-scrollbar">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className="ios-avatar flex-shrink-0">{message.type === 'user' ? (<User className="w-4 h-4" />) : (<Bot className="w-4 h-4" />)}</div>
                  <div className={`ios-bubble ${message.type === 'user' ? 'ios-bubble-user' : 'ios-bubble-ai'}`}>
                    <div className="flex items-start space-x-2">
                      <p className="text-sm flex-1">{message.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs ios-timestamp">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {message.type === 'ai' ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 mr-1">
                            <button onClick={() => setMessages(prev => prev.map(m => m.id !== message.id ? m : { ...m, reaction: m.reaction === 'like' ? null : 'like' }))} className={`p-1 rounded transition-colors transition-transform hover:bg-black/5 active:scale-95 ${message.reaction === 'like' ? 'text-blue-600 opacity-100' : message.reaction === 'dislike' ? 'opacity-40 text-muted-foreground' : 'text-muted-foreground opacity-80'}`}>
                              <ThumbsUp className={`w-3 h-3 ${message.reaction === 'like' ? 'scale-105' : ''}`} strokeWidth={message.reaction === 'like' ? 2.5 : 2} />
                            </button>
                            <button onClick={() => setMessages(prev => prev.map(m => m.id !== message.id ? m : { ...m, reaction: m.reaction === 'dislike' ? null : 'dislike' }))} className={`p-1 rounded transition-colors transition-transform hover:bg-black/5 active:scale-95 ${message.reaction === 'dislike' ? 'text-red-600 opacity-100' : message.reaction === 'like' ? 'opacity-40 text-muted-foreground' : 'text-muted-foreground opacity-80'}`}>
                              <ThumbsDown className={`w-3 h-3 ${message.reaction === 'dislike' ? 'scale-105' : ''}`} strokeWidth={message.reaction === 'dislike' ? 2.5 : 2} />
                            </button>
                          </div>
                          <button onClick={() => speakText(message.content, { lang: 'en-US', rate: 0.9 })} className="p-1 rounded hover:bg-black/5 transition-colors" title="Listen to message"><Volume2 className="w-3 h-3" /></button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-md">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                <div className="ios-bubble ios-bubble-ai min-w-0 flex-1">
                  <div className="flex items-center justify-between space-x-3">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{loadingMessage}</span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${loadingProgress}%` }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{loadingProgress < 100 ? `${Math.round(loadingProgress)}% complete` : 'Finalizing...'}</div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="ios-composer">
          <div className="ios-input-wrap">
            <div className="ios-input-field">
            <button onClick={() => { if (isRecording) { stopRecording(); } else { startRecording().catch(err => console.error('Failed to start recording:', err)); } }} className={`p-3 rounded-full transition-all duration-200 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/60 ring-1 ring-white/60 backdrop-blur-sm text-gray-900 hover:bg-white/70 shadow-sm'}`} title={isRecording ? 'Stop recording' : 'Start voice input'}>{isRecording ? (<MicOff className="w-5 h-5" />) : (<Mic className="w-5 h-5" />)}</button>
              <textarea ref={inputRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Type your message here..." className="ios-textarea" rows={1} style={{ minHeight: '44px', maxHeight: '140px', height: 'auto' }} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }} />
              <button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isLoading} className="ios-send-button" title="Send message"><Send className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Mobile slide-over for chat history */}
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          <motion.div
            key="mb-backdrop-enhanced"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <motion.aside
            key="mb-panel-enhanced"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="fixed inset-y-0 left-0 z-[110] w-[86%] max-w-[360px] bg-white border-r border-slate-200/70 shadow-xl flex flex-col md:hidden"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-slate-700" />
                <span className="text-base font-semibold">Chats History</span>
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
            <div className="px-2 flex-1 overflow-y-auto ios-scrollbar" style={{ paddingBottom: 'max(var(--bottom-nav-height, 0px), env(safe-area-inset-bottom))' }}>
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
                            onClick={(e) => { e.stopPropagation(); const t = window.prompt('Enter chat name', s.title || 'New Chat'); if (!t) return; supabaseService.renameEnhancedSession(s.id, t).then(r => { if (r?.success) setSessions(prev => prev.map(x => x.id === s.id ? { ...x, title: t } : x)); }); }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); const ok = window.confirm('Delete this chat?'); if (!ok) return; supabaseService.deleteEnhancedSession(s.id).then(r => { if (r?.success) setSessions(prev => prev.filter(x => x.id !== s.id)); if (selectedSessionId === s.id) { setSelectedSessionId(null); setMessages([{ id: Date.now(), type: 'ai', content: 'New enhanced chat started. What would you like to practice?', timestamp: new Date() }]); } }); }}
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
    </>
  );
};

export default EnhancedChat;