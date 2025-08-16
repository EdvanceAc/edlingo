/**
 * Web fallback shim for electronAPI
 * Provides localStorage-based fallbacks for Electron IPC methods when running in browser
 */

// Check if we're running in a browser environment
const isBrowser = typeof window !== 'undefined' && !window.electronAPI;

// Default user ID for localStorage keys
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Storage keys
const STORAGE_KEYS = {
  THEME: `theme_${DEFAULT_USER_ID}`,
  PROGRESS: `progress_${DEFAULT_USER_ID}`,
  SETTINGS: 'app_settings',
  AI_SETTINGS: 'ai_settings',
  VOCABULARY: 'vocabulary_words',
  GRAMMAR_EXERCISES: 'grammar_exercises'
};

// Default settings
const DEFAULT_SETTINGS = {
  language: 'en',
  volume: 50,
  notifications: true,
  autoSave: true,
  theme: 'system'
};

const DEFAULT_AI_SETTINGS = {
  provider: 'transformers',
  apiKey: '',
  model: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct',
  geminiApiKey: '',
  useGemini: false
};

const DEFAULT_PROGRESS = {
  level: 'beginner',
  streak: 0,
  points: 0,
  completedLessons: [],
  vocabulary: [],
  achievements: []
};

// Utility functions
const safeJSONParse = (str, defaultValue = {}) => {
  try {
    return str ? JSON.parse(str) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const safeJSONStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
};

// Mock implementations for browser environment
const electronAPIShim = {
  // Generic invoke method
  invoke: async (channel, ...args) => {
    console.warn(`electronAPI.invoke('${channel}') called in browser - using fallback`);

    // Handle AI channels
    if (channel === 'ai:getStatus') {
      return {
        isReady: true,
        status: 'browser_mode',
        provider: 'fallback',
        model: 'local'
      };
    }

    if (channel === 'ai:generateResponse') {
      try {
        const [userMessage, conversationContext, options] = args;
        const response = await electronAPIShim.generateAIResponse(
          userMessage,
          conversationContext,
          options
        );
        return { success: true, response, provider: 'shim' };
      } catch (error) {
        console.error('AI generateResponse (shim) error:', error);
        return { success: false, error: error.message };
      }
    }

    if (channel === 'ai:generateLanguageLearningResponse') {
      try {
        const [userMessage, learningContext] = args;
        const response = await electronAPIShim.generateLanguageLearningResponse(
          userMessage,
          learningContext
        );
        return { success: true, response, provider: 'shim' };
      } catch (error) {
        console.error('AI generateLanguageLearningResponse (shim) error:', error);
        return { success: false, error: error.message };
      }
    }

    if (channel === 'ai:generateResponseStream') {
      console.warn('AI streaming not available in browser mode');
      return { success: false, error: 'Streaming responses not available in browser mode' };
    }

    if (channel === 'ai:startLiveSession') {
      const [options] = args;
      return await electronAPIShim.startLiveSession(options);
    }

    if (channel === 'ai:sendLiveMessage') {
      const [sessionId, message] = args;
      return await electronAPIShim.sendLiveMessage(sessionId, message);
    }

    if (channel.startsWith('ai:')) {
      console.warn(`AI operation '${channel}' not available in browser mode`);
      return { success: false, error: `AI operation '${channel}' not available in browser mode` };
    }

    // Handle DB channels with structured fallbacks
    if (channel.startsWith('db:')) {
      // For security and simplicity, we do not perform DB actions here.
      // Frontend code should use Supabase client directly in browser mode.
      console.warn(`Database operation '${channel}' not available in browser mode; use Supabase client directly.`);
      return { success: false, error: `Database operation '${channel}' not available in browser mode` };
    }

    // Default fallback for unsupported channels
    return { success: false, error: `Unsupported channel '${channel}' in browser mode` };
  },

  // AI Chat functionality - return fallback responses
  sendChatMessage: async (message) => {
    console.warn('sendChatMessage called in browser - using fallback response');
    return `I'm in browser mode. You said: "${message}". This is a fallback response.`;
  },

  generateAIResponse: async (userMessage, conversationContext, options) => {
    console.warn('generateAIResponse called in browser - using fallback response');
    return `Browser fallback response to: "${userMessage}"`;
  },

  generateLanguageLearningResponse: async (userMessage, learningContext) => {
    console.warn('generateLanguageLearningResponse called in browser - using fallback response');
    return `Learning response (browser fallback): "${userMessage}"`;
  },

  // Streaming AI functionality - mock streams
  generateResponseStream: async (messages, options) => {
    console.warn('generateResponseStream called in browser - no streaming available');
    return null;
  },

  startLiveSession: async (options) => {
    console.warn('startLiveSession called in browser - not available');
    return { success: false, error: 'Live sessions not available in browser' };
  },

  sendLiveMessage: async (sessionId, message) => {
    console.warn('sendLiveMessage called in browser - not available');
    return { success: false, error: 'Live messaging not available in browser' };
  },

  // Audio processing - mock implementations
  processAudio: async (audioData) => {
    console.warn('processAudio called in browser - not available');
    return null;
  },

  // File operations - use browser file APIs where possible
  openFile: async () => {
    console.warn('openFile called in browser - not implemented');
    return null;
  },

  saveFile: async (data) => {
    console.warn('saveFile called in browser - not implemented');
    return null;
  },

  // App information
  getVersion: async () => {
    return '1.0.0-browser';
  },

  // Theme management with localStorage
  setTheme: async (theme) => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      return { success: true };
    } catch (error) {
      console.error('Failed to save theme:', error);
      return { success: false, error: error.message };
    }
  },

  getTheme: async () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'system';
    } catch (error) {
      console.error('Failed to get theme:', error);
      return 'system';
    }
  },

  // Window controls - no-op in browser
  minimizeWindow: async () => {
    console.warn('minimizeWindow called in browser - not available');
  },

  maximizeWindow: async () => {
    console.warn('maximizeWindow called in browser - not available');
  },

  closeWindow: async () => {
    console.warn('closeWindow called in browser - not available');
  },

  // Speech and audio - no-op implementations
  startRecording: async () => {
    console.warn('startRecording called in browser - not available');
    return null;
  },

  stopRecording: async () => {
    console.warn('stopRecording called in browser - not available');
    return null;
  },

  playAudio: async (audioUrl) => {
    console.warn('playAudio called in browser - not available');
    return null;
  },

  // Audio analysis - mock implementation for browser
  analyzeAudio: async (audioData, targetText) => {
    console.warn('analyzeAudio called in browser - using mock response');
    return {
      accuracy: Math.random() * 0.3 + 0.7, // Mock 70-100% accuracy
      feedback: 'Audio analysis not available in browser mode',
      suggestions: ['Practice pronunciation', 'Speak more clearly']
    };
  },

  // Text-to-speech - fallback to Web Speech API
  speakText: async (text, options = {}) => {
    console.warn('speakText called in browser - using Web Speech API fallback');
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      if (options.rate) utterance.rate = options.rate;
      if (options.pitch) utterance.pitch = options.pitch;
      if (options.volume) utterance.volume = options.volume;
      if (options.lang) utterance.lang = options.lang;
      speechSynthesis.speak(utterance);
      return { success: true };
    } else {
      console.warn('Web Speech API not supported');
      return { success: false, error: 'Speech synthesis not available' };
    }
  },

  // Progress management with localStorage
  saveProgress: async (progress) => {
    try {
      const existingProgress = safeJSONParse(
        localStorage.getItem(STORAGE_KEYS.PROGRESS),
        DEFAULT_PROGRESS
      );
      const updatedProgress = { ...existingProgress, ...progress };
      localStorage.setItem(STORAGE_KEYS.PROGRESS, safeJSONStringify(updatedProgress));
      return { success: true };
    } catch (error) {
      console.error('Failed to save progress:', error);
      return { success: false, error: error.message };
    }
  },

  loadProgress: async () => {
    try {
      return safeJSONParse(
        localStorage.getItem(STORAGE_KEYS.PROGRESS),
        DEFAULT_PROGRESS
      );
    } catch (error) {
      console.error('Failed to load progress:', error);
      return DEFAULT_PROGRESS;
    }
  },

  // Vocabulary management with localStorage
  addWord: async (word) => {
    try {
      const words = safeJSONParse(localStorage.getItem(STORAGE_KEYS.VOCABULARY), []);
      words.push({ ...word, id: Date.now(), dateAdded: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.VOCABULARY, safeJSONStringify(words));
      return { success: true };
    } catch (error) {
      console.error('Failed to add word:', error);
      return { success: false, error: error.message };
    }
  },

  getWords: async () => {
    try {
      return safeJSONParse(localStorage.getItem(STORAGE_KEYS.VOCABULARY), []);
    } catch (error) {
      console.error('Failed to get words:', error);
      return [];
    }
  },

  // Grammar exercises - mock data
  getGrammarExercises: async () => {
    return [
      {
        id: 1,
        question: "Complete the sentence: I _____ to the store yesterday.",
        options: ["go", "went", "going", "gone"],
        correctAnswer: 1,
        explanation: "Use past tense 'went' for actions completed in the past."
      }
    ];
  },

  submitGrammarAnswer: async (answer) => {
    return {
      correct: Math.random() > 0.5,
      explanation: "This is a browser fallback explanation."
    };
  },

  // Settings management with localStorage
  getSetting: async (key) => {
    try {
      const settings = safeJSONParse(localStorage.getItem(STORAGE_KEYS.SETTINGS), DEFAULT_SETTINGS);
      return settings[key];
    } catch (error) {
      console.error('Failed to get setting:', error);
      return null;
    }
  },

  setSetting: async (key, value) => {
    try {
      const settings = safeJSONParse(localStorage.getItem(STORAGE_KEYS.SETTINGS), DEFAULT_SETTINGS);
      settings[key] = value;
      localStorage.setItem(STORAGE_KEYS.SETTINGS, safeJSONStringify(settings));
      return { success: true };
    } catch (error) {
      console.error('Failed to set setting:', error);
      return { success: false, error: error.message };
    }
  },

  getSettings: async () => {
    try {
      return safeJSONParse(localStorage.getItem(STORAGE_KEYS.SETTINGS), DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (settings) => {
    try {
      const existingSettings = safeJSONParse(localStorage.getItem(STORAGE_KEYS.SETTINGS), DEFAULT_SETTINGS);
      const updatedSettings = { ...existingSettings, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, safeJSONStringify(updatedSettings));
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  },

  getAiSettings: async () => {
    try {
      return safeJSONParse(localStorage.getItem(STORAGE_KEYS.AI_SETTINGS), DEFAULT_AI_SETTINGS);
    } catch (error) {
      console.error('Failed to get AI settings:', error);
      return DEFAULT_AI_SETTINGS;
    }
  },

  saveAiSettings: async (aiSettings) => {
    try {
      const existingSettings = safeJSONParse(localStorage.getItem(STORAGE_KEYS.AI_SETTINGS), DEFAULT_AI_SETTINGS);
      const updatedSettings = { ...existingSettings, ...aiSettings };
      localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, safeJSONStringify(updatedSettings));
      return { success: true };
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      return { success: false, error: error.message };
    }
  },

  // MCP functionality - not available in browser
  runMcp: async (serverName, toolName, args) => {
    console.warn('runMcp called in browser - not available');
    return { success: false, error: 'MCP not available in browser' };
  },

  // Notifications - use browser notifications if available
  showNotification: async (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
      return { success: true };
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
        return { success: true };
      }
    }
    console.warn('Browser notifications not available or denied');
    return { success: false, error: 'Notifications not available' };
  },

  // Event listeners - no-op implementations for browser
  onThemeChanged: (callback) => {
    console.warn('onThemeChanged listener not available in browser');
    return () => {};
  },

  onProgressUpdate: (callback) => {
    console.warn('onProgressUpdate listener not available in browser');
    return () => {};
  },

  onAudioProcessed: (callback) => {
    console.warn('onAudioProcessed listener not available in browser');
    return () => {};
  },

  onStreamChunk: (callback) => {
    console.warn('onStreamChunk listener not available in browser');
    return () => {};
  },

  onStreamError: (callback) => {
    console.warn('onStreamError listener not available in browser');
    return () => {};
  },

  onLiveMessage: (callback) => {
    console.warn('onLiveMessage listener not available in browser');
    return () => {};
  },

  onLiveError: (callback) => {
    console.warn('onLiveError listener not available in browser');
    return () => {};
  },

  onLiveClose: (callback) => {
    console.warn('onLiveClose listener not available in browser');
    return () => {};
  },

  removeAllListeners: (channel) => {
    console.warn('removeAllListeners not available in browser');
  }
};

// Initialize the shim if we're in a browser environment
export const initializeElectronAPIShim = () => {
  if (isBrowser) {
    console.log('Initializing electronAPI shim for browser environment');
    window.electronAPI = electronAPIShim;
    
    // Mark the shim so environment detection knows it's not real Electron
    window.electronAPI._isShim = true;
    
    // Also set a flag to indicate we're in browser mode
    window.isBrowserMode = true;
  }
};

export default electronAPIShim;