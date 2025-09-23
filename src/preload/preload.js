const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Generic invoke method for IPC communication
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // AI Chat functionality
  sendChatMessage: (message) => ipcRenderer.invoke('ai-chat', message),
  generateAIResponse: (userMessage, conversationContext, options) => ipcRenderer.invoke('ai:generateResponse', userMessage, conversationContext, options),
  generateLanguageLearningResponse: (userMessage, learningContext) => ipcRenderer.invoke('ai:generateLanguageLearningResponse', userMessage, learningContext),
  
  // Streaming AI functionality
  generateResponseStream: (messages, options) => ipcRenderer.invoke('ai:generateResponseStream', messages, options),
  startLiveSession: (options) => ipcRenderer.invoke('ai:startLiveSession', options),
  sendLiveMessage: (sessionId, message) => ipcRenderer.invoke('ai:sendLiveMessage', sessionId, message),
  
  // Audio processing
  processAudio: (audioData) => ipcRenderer.invoke('process-audio', audioData),
  analyzeAudio: (audioData, targetText) => ipcRenderer.invoke('audio:analyze', audioData, targetText),
  
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // App information
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Theme management
  setTheme: (theme) => {
    // Use a default UUID for theme settings until user authentication is implemented
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    return ipcRenderer.invoke('theme:set', defaultUserId, theme);
  },
  getTheme: () => ipcRenderer.invoke('theme:get'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // Pronunciation and speech
  startRecording: () => ipcRenderer.invoke('speech:startRecording'),
  stopRecording: () => ipcRenderer.invoke('speech:stopRecording'),
  playAudio: (audioUrl) => ipcRenderer.invoke('audio:play', audioUrl),
  
  // Language learning features
  saveProgress: (progress) => {
    // Use a default UUID for user until authentication is implemented
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    return ipcRenderer.invoke('db:updateUserProgress', defaultUserId, progress);
  },
  loadProgress: () => {
    // Use a default UUID for user until authentication is implemented
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    return ipcRenderer.invoke('db:getUserProgress', defaultUserId);
  },
  
  // Vocabulary management
  addWord: (word) => ipcRenderer.invoke('vocabulary:add', word),
  getWords: () => ipcRenderer.invoke('vocabulary:get'),
  
  // Grammar exercises
  getGrammarExercises: () => ipcRenderer.invoke('grammar:getExercises'),
  submitGrammarAnswer: (answer) => ipcRenderer.invoke('grammar:submitAnswer', answer),
  
  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAiSettings: () => ipcRenderer.invoke('settings:getAiSettings'),
  
  // MCP (Model Context Protocol) functionality
  runMcp: (serverName, toolName, args) => ipcRenderer.invoke('mcp:run', serverName, toolName, args),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),
  
  // Event listeners for real-time updates
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme:changed', callback);
    return () => ipcRenderer.removeListener('theme:changed', callback);
  },
  
  onProgressUpdate: (callback) => {
    ipcRenderer.on('progress:updated', callback);
    return () => ipcRenderer.removeListener('progress:updated', callback);
  },
  
  onAudioProcessed: (callback) => {
    ipcRenderer.on('audio:processed', callback);
    return () => ipcRenderer.removeListener('audio:processed', callback);
  },
  
  // Streaming AI event listeners
  onStreamChunk: (callback) => {
    ipcRenderer.on('ai:streamChunk', callback);
    return () => ipcRenderer.removeListener('ai:streamChunk', callback);
  },
  
  onStreamError: (callback) => {
    ipcRenderer.on('ai:streamError', callback);
    return () => ipcRenderer.removeListener('ai:streamError', callback);
  },
  
  onLiveMessage: (callback) => {
    ipcRenderer.on('live-session:message', callback);
    return () => ipcRenderer.removeListener('live-session:message', callback);
  },
  
  onLiveError: (callback) => {
    ipcRenderer.on('live-session:error', callback);
    return () => ipcRenderer.removeListener('live-session:error', callback);
  },
  
  onLiveClose: (callback) => {
    ipcRenderer.on('live-session:closed', callback);
    return () => ipcRenderer.removeListener('live-session:closed', callback);
  },
  
  // Helper method to remove all listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose a limited set of Node.js APIs for specific use cases
contextBridge.exposeInMainWorld('nodeAPI', {
  platform: process.platform,
  versions: process.versions
});