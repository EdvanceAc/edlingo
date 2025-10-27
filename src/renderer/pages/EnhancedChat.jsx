import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, Bot, User, Loader2, Settings, BookOpen, Target, Zap, MessageSquare, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
          setMessages(mapped.length > 0 ? mapped : messages);
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

  const modeIcons = { conversation: Bot, grammar: BookOpen, vocabulary: Target, pronunciation: Volume2 };
  const ModeIcon = modeIcons[chatMode];
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
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
        <div className="relative overflow-hidden p-4 flex-shrink-0 rounded-xl bg-white/40 backdrop-blur-xl ring-1 ring-white/60 shadow-lg">
          <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br from-violet-200/40 via-sky-200/30 to-pink-200/40" />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <ModeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Enhanced Chat</h1>
                <p className="text-sm text-muted-foreground">{chatMode.charAt(0).toUpperCase() + chatMode.slice(1)} practice • {difficulty} level</p>
              </div>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-black/5 transition-colors"><Settings className="w-5 h-5" /></button>
          </div>
          <AnimatePresence>
            {showSettings && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 p-4 rounded-xl bg-white/40 backdrop-blur-xl ring-1 ring-white/60 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Chat Mode</label>
                    <select value={chatMode} onChange={(e) => setChatMode(e.target.value)} className="w-full p-2 rounded-xl ring-1 ring-white/60 bg-white/60 backdrop-blur-sm shadow-sm">
                      <option value="conversation">General Conversation</option>
                      <option value="grammar">Grammar Focus</option>
                      <option value="vocabulary">Vocabulary Building</option>
                      <option value="pronunciation">Pronunciation Practice</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full p-2 rounded-xl ring-1 ring-white/60 bg-white/60 backdrop-blur-sm shadow-sm">
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
              <motion.div key={message.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'}`}>
                    {message.type === 'user' ? (<User className="w-4 h-4 text-white" />) : (<ModeIcon className="w-4 h-4 text-white" />)}
                  </div>
                  <div className="space-y-2">
                    <div className={`rounded-2xl px-4 py-3 shadow-sm ring-1 ${message.type === 'user' ? 'bg-white/70 backdrop-blur-md ring-white/60 text-gray-900 rounded-br-md' : 'bg-white/60 backdrop-blur-md ring-white/60 text-gray-700 rounded-bl-md'}`}>
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {message.type === 'ai' && (<button onClick={() => speakText(message.content, { lang: 'en-US', rate: 0.9 })} className="ml-2 p-1 rounded hover:bg-black/5 transition-colors" title="Listen to message"><Volume2 className="w-3 h-3" /></button>)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-xs">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/60 backdrop-blur-md ring-1 ring-white/60 shadow-sm">
                  <div className="flex items-center space-x-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm text-muted-foreground">Analyzing...</span></div>
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
            <button onClick={() => { if (isRecording) { stopRecording(); } else { startRecording().catch(err => console.error('Failed to start recording:', err)); } }} className={`p-3 rounded-full transition-all duration-200 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/60 ring-1 ring-white/60 backdrop-blur-sm text-gray-900 hover:bg-white/70 shadow-sm'}`} title={isRecording ? 'Stop recording' : 'Start voice input'}>{isRecording ? (<MicOff className="w-5 h-5" />) : (<Mic className="w-5 h-5" />)}</button>
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={`Type your message for ${chatMode} practice...`} className="w-full resize-none rounded-xl ring-1 ring-white/60 bg-white/60 backdrop-blur-sm shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" rows={1} style={{ minHeight: '48px', maxHeight: '120px', height: 'auto' }} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
            </div>
            <button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isLoading} className="p-3 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-white/60 text-gray-900 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative shadow-sm" title="Send message"><Send className="w-5 h-5" />{chatMode !== 'conversation' && (<div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center"><Zap className="w-2 h-2 text-white" /></div>)}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChat;