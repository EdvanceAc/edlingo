import React, { createContext, useContext, useState, useEffect } from 'react';
import aiService from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService';
import { ConversationMemory, addMessage as cmAdd, getRecentContext as cmGet, loadHistory as cmLoad, clearHistory as cmClear, saveHistory as cmSave } from '../utils/conversationMemory';

const AIContext = createContext();

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const { user } = useAuth();
  const [aiStatus, setAiStatus] = useState('not_initialized');
  const [aiSettings, setAiSettings] = useState({
    provider: 'transformers',
    apiKey: '',
    model: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct',
    geminiApiKey: '',
    useGemini: false
  });
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    loadAISettings();
  }, []);

  // Auto-initialize AI service when settings are loaded
  useEffect(() => {
    const autoInitializeAI = async () => {
      // Only auto-initialize if AI is not already initialized or initializing
      if (!isInitializing && aiStatus === 'not_initialized') {
        console.log('Auto-initializing AI service at startup...');
        try {
          await initializeAI();
        } catch (error) {
          console.warn('Auto-initialization failed, AI will initialize on first use:', error);
        }
      }
    };

    // Auto-initialize after a short delay to ensure settings are loaded
    const timeoutId = setTimeout(autoInitializeAI, 500);
    
    return () => clearTimeout(timeoutId);
  }, [aiStatus, isInitializing]);

  const loadAISettings = async () => {
    try {
      const settings = await window.electronAPI?.getAiSettings?.() || {};
      setAiSettings(prev => ({
        ...prev,
        provider: settings.provider || 'transformers',
        apiKey: settings.apiKey || '',
        model: settings.model || 'onnx-community/Qwen2.5-Coder-0.5B-Instruct',
        geminiApiKey: settings.geminiApiKey || '',
        useGemini: settings.useGemini || false
      }));
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const saveAISettings = async (newSettings) => {
    try {
      await window.electronAPI?.saveAiSettings?.(newSettings);
      setAiSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      throw error;
    }
  };

  const initializeAI = async () => {
    if (isInitializing || aiStatus === 'ready') return;
    
    setIsInitializing(true);
    setAiStatus('initializing');
    
    try {
      // Initialize AI service with Gemini options if available
      const initOptions = {};
      const envGeminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const geminiApiKey = aiSettings.geminiApiKey || envGeminiApiKey;
      
      if (geminiApiKey) {
        initOptions.geminiApiKey = geminiApiKey;
      }
      
      await aiService.initialize(initOptions);
      
      // Check if Gemini is available or fall back to backend
      const fullStatus = await aiService.getFullStatus();
      const isGeminiReady = fullStatus.gemini?.isReady || false;
      const isBackendReady = fullStatus.backend?.isReady || false;
      
      console.log('AI Status Check:', {
        isGeminiReady,
        isBackendReady,
        browserMode: aiService.browserMode,
        fullStatus
      });
      
      // In browser mode, gracefully handle Gemini API failures
      if (aiService.browserMode) {
        if (isGeminiReady) {
          setAiStatus('ready');
        } else {
          console.warn('Gemini API not available in browser mode, using fallback responses');
          setAiStatus('ready'); // Still set to ready to allow fallback functionality
        }
      } else {
        if (isGeminiReady || isBackendReady) {
          setAiStatus('ready');
        } else {
          console.warn('No AI providers available, using fallback responses');
          setAiStatus('ready'); // Still set to ready to allow fallback functionality
        }
      }
    } catch (error) {
      console.error('Failed to initialize AI:', error);
      
      // Check if it's a Gemini API suspension error
      if (error.message && (error.message.includes('CONSUMER_SUSPENDED') || error.message.includes('Permission denied'))) {
        console.warn('Gemini API key suspended or permission denied, continuing with fallback mode');
        setAiStatus('ready'); // Allow fallback functionality
      } else {
        // Don't throw error, just log it and continue with fallback
        console.warn('AI initialization failed, continuing with fallback functionality');
        setAiStatus('ready'); // Set to ready to allow fallback responses
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const generateResponse = async (message, options = {}) => {
    if (aiStatus !== 'ready') {
      throw new Error('AI service is not ready');
    }

    try {
      console.log('AIProvider: Generating response for message:', message);

      // Ensure session exists in Supabase if connected and user is present
      let sessionId = currentSessionId;
      if (!sessionId && user?.id && supabaseService.isConnected) {
        const created = await supabaseService.createChatSession(user.id, message?.slice(0, 60) || 'New Chat');
        if (created?.success && created?.data?.id) {
          sessionId = created.data.id;
          setCurrentSessionId(sessionId);
        } else {
          // Fallback to local session
          sessionId = sessionId || crypto.randomUUID();
          setCurrentSessionId(sessionId);
        }
      }
      // If still no session, create a local one
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        setCurrentSessionId(sessionId);
      }

      // Build contextual memory: load existing, append current user message, keep last 10 turns (20 messages)
      const MEMORY_WINDOW = 20;
      const prior = cmGet(sessionId, MEMORY_WINDOW);
      // If local memory is empty (first load on this device), fall back to in-memory provider history
      const providerHist = (conversationHistory || []).filter(h => !h.sessionId || h.sessionId === sessionId);
      const baseContext = prior.length > 0 ? prior : providerHist.slice(-MEMORY_WINDOW);
      cmAdd(sessionId, { role: 'user', content: message });
      const contextForModel = (baseContext.length > 0 ? baseContext : []).concat([{ role: 'user', content: message }]).slice(-MEMORY_WINDOW);

      const result = await aiService.generateLanguageLearningResponse(message, {
        targetLanguage: options.targetLanguage || 'English',
        userLevel: options.userLevel || 'intermediate',
        focusArea: options.focusArea || 'conversation',
        sessionId: sessionId || currentSessionId,
        user: user,
        conversation: contextForModel
      });

      console.log('AIProvider: Raw result from aiService:', result);

      // Handle different response formats
      let response;
      if (result && typeof result === 'object') {
        if (result.success) {
          response = typeof result.response === 'string' 
            ? result.response 
            : (result.response?.message || result.response?.text || String(result.response || ''));
          console.log('AIProvider: Extracted response from success object:', response);
          // Update session ID if using Supabase Gemini service
          if (result.provider === 'supabase-gemini' && result.sessionId) {
            sessionId = result.sessionId;
            setCurrentSessionId(sessionId);
          }
        } else {
          const raw = result.response || result.error || 'Sorry, I encountered an error.';
          response = typeof raw === 'string' ? raw : (raw?.message || raw?.text || String(raw || ''));
          console.log('AIProvider: Extracted response from error object:', response);
        }
      } else {
        response = result;
        console.log('AIProvider: Using direct string response:', response);
      }

      if (!response || response === 'undefined' || typeof response === 'undefined') {
        console.warn('AIProvider: Response is undefined, using fallback');
        response = "I'm here to help you learn! Could you please rephrase your question or try asking something else?";
      }

      console.log('AIProvider: Final response to return:', response);

      // Update conversation history
      cmAdd(sessionId, { role: 'assistant', content: response });
      const updatedMemory = cmGet(sessionId, 20);
      setConversationHistory(updatedMemory.map(m => ({ ...m, sessionId })));

      // Persist assistant message to Supabase (user message can be saved by the UI)
      if (user?.id && supabaseService.isConnected && sessionId) {
        try {
          await supabaseService.saveChatMessage({
            sessionId,
            userId: user.id,
            role: 'assistant',
            content: response,
            metadata: { targetLanguage: options.targetLanguage || 'English', focusArea: options.focusArea || 'conversation' }
          });
        } catch (e) {
          console.warn('Failed to persist assistant message:', e?.message || e);
        }
      }

      return response;
    } catch (error) {
      console.error('AIProvider: Failed to generate AI response:', error);
      throw error;
    }
  };

  const analyzeText = async (text, options = {}) => {
    if (aiStatus !== 'ready') {
      return aiService.analyzeText(text, options); // Use fallback analysis
    }

    try {
      return await aiService.analyzeText(text, {
        targetLanguage: options.targetLanguage || 'English',
        type: options.type || 'grammar',
        ...options
      });
    } catch (error) {
      console.error('Failed to analyze text:', error);
      throw error;
    }
  };

  const clearConversationHistory = () => {
    try {
      if (currentSessionId) cmClear(currentSessionId);
    } catch {
      // ignore
    } finally {
      setConversationHistory([]);
      setCurrentSessionId(null);
    }
  };

  const startNewSession = async () => {
    // Create Supabase-backed session if connected; fallback to local UUID
    let newSessionId = null;
    if (supabaseService.isConnected && user?.id) {
      try {
        const created = await supabaseService.createChatSession(user.id);
        if (created?.success && created?.data?.id) {
          newSessionId = created.data.id;
        }
      } catch (e) {
        console.warn('Failed to create Supabase chat session, using local session:', e?.message || e);
      }
    }
    if (!newSessionId) {
      newSessionId = crypto.randomUUID();
    }
    setCurrentSessionId(newSessionId);
    cmClear(newSessionId);
    setConversationHistory([]);
    console.log('Started new session with ID:', newSessionId);
    return newSessionId;
  };

  const getCurrentSessionId = () => {
    return currentSessionId;
  };

  const setCurrentSessionIdDirect = (sessionId) => {
    setCurrentSessionId(sessionId || null);
    if (sessionId) {
      const hist = cmLoad(sessionId);
      setConversationHistory(hist.map(m => ({ ...m, sessionId })));
    } else {
      setConversationHistory([]);
    }
  };

  const loadConversationFromMessages = (messages = []) => {
    const mapped = messages.map(m => ({
      role: (m?.message_type || m?.role || (m?.is_user ? 'user' : 'assistant')) === 'user' ? 'user' : 'assistant',
      content: m?.content || m?.message || '',
      timestamp: new Date(m.created_at || Date.now()),
      sessionId: m.session_id
    }));
    setConversationHistory(mapped);
    try {
      const sid = currentSessionId || (messages && messages[0]?.session_id) || null;
      if (sid) {
        // Persist to local storage so future loads (after logout) have context immediately
        cmSave(sid, mapped.map(({ role, content, timestamp }) => ({ role, content, timestamp })));
      }
    } catch {
      // ignore storage errors
    }
  };

  const configureGemini = async (apiKey) => {
    try {
      const result = await aiService.configureGemini(apiKey);
      if (result.success) {
        const newSettings = { ...aiSettings, geminiApiKey: apiKey, useGemini: true };
        await saveAISettings(newSettings);
        return { success: true };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Failed to configure Gemini:', error);
      return { success: false, error: error.message };
    }
  };

  const disableGemini = async () => {
    try {
      aiService.disableGemini();
      const newSettings = { ...aiSettings, useGemini: false };
      await saveAISettings(newSettings);
    } catch (error) {
      console.error('Failed to disable Gemini:', error);
    }
  };

  const getConversationContext = (limit = 6) => {
    return conversationHistory.slice(-limit);
  };

  const value = {
    // Status
    aiStatus,
    isInitializing,
    isReady: aiStatus === 'ready',
    
    // Settings
    aiSettings,
    saveAISettings,
    loadAISettings,
    
    // AI Operations
    initializeAI,
    generateResponse,
    analyzeText,
    
    // Conversation Management
    conversationHistory,
    clearConversationHistory,
    getConversationContext,
    startNewSession,
    getCurrentSessionId,
    currentSessionId,
    setCurrentSessionIdDirect,
    loadConversationFromMessages,
    
    // Utilities
    getStatusMessage: () => {
      const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const hasValidApiKey = envApiKey && envApiKey !== 'your_gemini_api_key_here' && envApiKey.length > 20;
      
      switch (aiStatus) {
        case 'ready': 
          return hasValidApiKey ? 'AI Ready' : 'AI Ready (Fallback Mode)';
        case 'initializing': 
          return 'Loading AI...';
        case 'error': 
          return 'AI Limited - Using Fallback';
        default: 
          return 'AI Offline';
      }
    },
    
    getStatusColor: () => {
      switch (aiStatus) {
        case 'ready': return 'text-green-500';
        case 'initializing': return 'text-yellow-500';
        case 'error': return 'text-red-500';
        default: return 'text-gray-400';
      }
    },
    
    // Gemini specific methods
    configureGemini,
    disableGemini,
    isGeminiAvailable: () => {
      const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (envApiKey) {
        return true;
      }
      return aiService.isGeminiAvailable();
    },
    getApiKey: () => {
      const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      return aiSettings.geminiApiKey || envApiKey || null;
    },
    getAIStatus: () => aiService.getFullStatus()
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};

export default AIProvider;


  const initializeAIService = async (settings) => {
    setAiStatus(prev => ({ ...prev, checkingGemini: true }));
    try {
      const apiKey = (
        import.meta.env?.VITE_GEMINI_API_KEY ||
        import.meta.env?.VITE_GOOGLE_GEMINI_API_KEY ||
        (typeof window !== 'undefined' ? window?.__ENV__?.VITE_GEMINI_API_KEY : undefined) ||
        (typeof window !== 'undefined' ? window?.__ENV__?.VITE_GOOGLE_GEMINI_API_KEY : undefined) ||
        (typeof window !== 'undefined' ? window?.ENV?.GEMINI_API_KEY : undefined) ||
        (typeof window !== 'undefined' ? window?.ENV?.VITE_GEMINI_API_KEY : undefined) ||
        (typeof window !== 'undefined' ? window?.ENV?.VITE_GOOGLE_GEMINI_API_KEY : undefined)
      );

      const isBrowserMode = typeof window !== 'undefined';
      setAiSettings(prev => ({ ...prev, apikey: apiKey }));

      await aiService.initialize({
        geminiApiKey: apiKey,
        isBrowserMode
      });

      setAiStatus(prev => ({ ...prev, checkingGemini: false, geminiReady: !!apiKey }));
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      setAiStatus(prev => ({ ...prev, checkingGemini: false, geminiReady: false }));
    }
  };