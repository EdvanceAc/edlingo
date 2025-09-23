import { GoogleGenerativeAI } from '@google/generative-ai';
import networkUtils from '../utils/networkUtils.js';

class ModernGeminiLiveService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.chat = null;
    this.isActive = false;
    this.sessionId = null;
    this.eventListeners = {
      message: [],
      error: [],
      close: [],
      'tts-start': [],
      'tts-end': [],
      'tts-error': [],
      'tts-stopped': [],
      'stt-start': [],
      'stt-interim': [],
      'stt-final': [],
      'stt-end': [],
      'stt-error': [],
      'stt-stopped': []
    };
    this.apiKey = null;
    this.recognition = null;
    this.isRecording = false;
    this.isRestarting = false;
    this.isSpeaking = false;
    this.conversationHistory = [];
    this.isInitialized = false;
    this.isConnected = false;
  }

  // Initialize the service with API key
  async initialize(apiKey) {
    try {
      if (!apiKey) {
        throw new Error('Gemini API key is required');
      }

      this.apiKey = apiKey;
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // Use Gemini 1.5 Flash for real-time conversations
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        systemInstruction: {
          role: 'system',
          parts: [{
            text: 'You are a helpful language learning assistant. Provide conversational responses that help users practice their target language. Keep responses natural, engaging, and educational. Correct mistakes gently and offer alternatives when appropriate.'
          }]
        }
      });

      this.isInitialized = true;
      console.log('Modern Gemini Live Service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Modern Gemini Live Service:', error);
      return { success: false, error: error.message };
    }
  }

  // Start a live conversation session with STT/TTS
  async startLiveSession(options = {}) {
    try {
      if (!this.model) {
        throw new Error('Service not initialized. Call initialize() first.');
      }

      if (this.isActive) {
        throw new Error('Live session already active');
      }

      // Start a new chat session with conversation-optimized settings
      this.chat = this.model.startChat({
        history: [],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxOutputTokens || 1024,
          topK: 40,
          topP: 0.95,
        },
        systemInstruction: {
          role: 'system',
          parts: [{
            text: `You are a helpful language learning assistant engaged in a live voice conversation. Keep your responses:
- Conversational and natural
- Concise but informative (1-3 sentences typically)
- Encouraging and supportive
- Focused on helping the user practice ${options.targetLanguage || 'English'}
- Appropriate for ${options.userLevel || 'intermediate'} level
- Gently correct mistakes when needed
- Ask follow-up questions to keep the conversation flowing`
          }]
        }
      });

      this.isActive = true;
      this.isConnected = true;
      this.sessionId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Auto-start speech recognition if requested
      if (options.autoStartSTT !== false) {
        setTimeout(() => {
          this.startSpeechRecognition({
            language: options.language || 'en-US'
          });
        }, 500);
      }

      console.log('Live session with STT/TTS started:', this.sessionId);
      return { success: true, sessionId: this.sessionId };
    } catch (error) {
      console.error('Failed to start live session:', error);
      this.emit('error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Send a message and get streaming response with automatic TTS
  async sendMessage(message, options = {}) {
    try {
      if (!this.isActive || !this.chat) {
        throw new Error('No active live session');
      }

      console.log('Sending message to Gemini:', message);

      // Send message and get streaming response
      const result = await this.chat.sendMessageStream(message);
      
      let fullResponse = '';
      
      // Process streaming chunks
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        // Emit streaming message
        this.emit('message', {
          type: 'text',
          content: fullResponse,
          isComplete: false,
          chunk: chunkText,
          timestamp: new Date().toISOString()
        });
      }

      // Emit final complete message
      this.emit('message', {
        type: 'text',
        content: fullResponse,
        isComplete: true,
        timestamp: new Date().toISOString()
      });

      // Automatically play TTS for the complete response
      if (fullResponse.trim() && options.autoTTS !== false) {
        setTimeout(() => {
          this.speak(fullResponse);
        }, 100); // Small delay to ensure UI updates first
      }

      console.log('Message sent successfully, response received');
      return { success: true, response: fullResponse, message: 'Message sent successfully' };
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit('error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // End the live session and cleanup STT/TTS
  async endLiveSession() {
    try {
      if (!this.isActive) {
        return { success: true, message: 'No active session to end' };
      }

      // Stop speech recognition
      this.stopSpeechRecognition();
      
      // Stop any ongoing TTS
      this.stopSpeaking();

      this.isActive = false;
      this.isConnected = false;
      this.chat = null;
      const sessionId = this.sessionId;
      this.sessionId = null;

      this.emit('close', { sessionId });
      
      console.log('Live session with STT/TTS ended:', sessionId);
      return { success: true, sessionId };
    } catch (error) {
      console.error('Failed to end live session:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced Text-to-Speech functionality
  async speak(text, options = {}) {
    try {
      if (!text) return { success: false, error: 'No text provided' };
      
      // Stop any current speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      this.isSpeaking = true;
      
      // Use Web Speech API for TTS
      if ('speechSynthesis' in window) {
        // Wait for voices to load
        await this.waitForVoices();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 0.8;
        utterance.lang = options.language || 'en-US';
        
        // Select the best available voice
        const voices = speechSynthesis.getVoices();
        let selectedVoice = null;
        
        // Priority order for realistic voices
        const preferredVoices = [
          'Google US English', 'Microsoft Zira', 'Microsoft David',
          'Alex', 'Samantha', 'Victoria', 'Karen', 'Moira'
        ];
        
        // Try to find a preferred voice
        for (const voiceName of preferredVoices) {
          selectedVoice = voices.find(voice => 
            voice.name.toLowerCase().includes(voiceName.toLowerCase()) &&
            voice.lang.startsWith('en')
          );
          if (selectedVoice) break;
        }
        
        // Fallback to any English voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang.startsWith('en') && !voice.localService
          ) || voices.find(voice => voice.lang.startsWith('en'));
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('Using voice:', selectedVoice.name);
        }
        
        // Set up event handlers
        utterance.onstart = () => {
          console.log('TTS started');
          this.emit('tts-start', { text });
        };
        
        utterance.onend = () => {
          console.log('TTS ended');
          this.isSpeaking = false;
          this.emit('tts-end', { text });
          this.emit('speechEnd');
        };
        
        utterance.onerror = (error) => {
          console.error('TTS error:', error);
          this.isSpeaking = false;
          this.emit('tts-error', { error: error.error });
        };
        
        // Speak the text
        speechSynthesis.speak(utterance);
        
        return { success: true };
      } else {
        throw new Error('Speech synthesis not supported');
      }
    } catch (error) {
      console.error('TTS error:', error);
      this.isSpeaking = false;
      return { success: false, error: error.message };
    }
  }
  
  // Helper method to wait for voices to load
  async waitForVoices() {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        speechSynthesis.onvoiceschanged = () => {
          resolve(speechSynthesis.getVoices());
        };
      }
    });
  }
  
  // Stop current TTS
  async stopSpeaking() {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      this.isSpeaking = false;
      this.emit('tts-stopped', {});
    }
    return { success: true };
  }

  // Enhanced Speech-to-Text functionality
  async startRecording() {
    return this.startSpeechRecognition();
  }

  async stopRecording() {
    this.stopSpeechRecognition();
    return { success: true };
  }

  async startSpeechRecognition(options = {}) {
    try {
      // Check browser compatibility
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser');
      }
      
      // Check microphone permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately as we only needed to check permissions
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError) {
        if (permissionError.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone permissions.');
        } else if (permissionError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone.');
        } else {
          throw new Error('Failed to access microphone: ' + permissionError.message);
        }
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition for real-time conversation
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.language || 'en-US';
      this.recognition.maxAlternatives = 1;
      
      this.isRecording = true;
      
      // Set up event handlers
      this.recognition.onstart = () => {
        console.log('Speech recognition started');
        this.emit('stt-start', { status: 'listening' });
      };
      
      this.recognition.onresult = async (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Emit interim results for real-time feedback
        if (interimTranscript) {
          this.emit('stt-interim', { transcript: interimTranscript });
        }
        
        // Process final transcript
        if (finalTranscript.trim()) {
          console.log('Final transcript:', finalTranscript);
          this.emit('stt-final', { transcript: finalTranscript });
          
          // Send to Gemini and get response
          try {
            const response = await this.sendMessage(finalTranscript.trim());
          } catch (error) {
            console.error('Error processing speech:', error);
            this.emit('error', { error: error.message });
          }
        }
      };
      
      this.recognition.onerror = async (event) => {
        console.error('Speech recognition error:', event.error);
        this.emit('stt-error', { error: event.error });
        
        // Enhanced network error handling
        if (event.error === 'network') {
          await this._handleNetworkError();
          return;
        }
        
        // Auto-restart on recoverable errors (except during manual restart)
        const recoverableErrors = ['no-speech', 'audio-capture', 'aborted'];
        if (recoverableErrors.includes(event.error) && !this.isRestarting) {
          this.isRestarting = true;
          setTimeout(() => {
            if (this.isActive) {
              try {
                // Clean shutdown of current recognition
                if (this.recognition) {
                  this.recognition.abort();
                  this.recognition = null;
                }
                // Create fresh recognition instance
                this._createNewRecognition();
                console.log('Speech recognition restarted after error:', event.error);
              } catch (restartError) {
                console.error('Failed to restart speech recognition:', restartError);
              } finally {
                this.isRestarting = false;
              }
            } else {
              this.isRestarting = false;
            }
          }, 1500);
        }
      };
      
      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.isRecording = false;
        this.emit('stt-end', { status: 'stopped' });
        
        // Auto-restart if session is still active and not already restarting
        if (this.isActive && !this.isRestarting) {
          setTimeout(() => {
            try {
              // Use proper restart method to avoid state conflicts
              this.startSpeechRecognition();
            } catch (error) {
              console.log('Recognition restart failed:', error);
            }
          }, 100);
        }
      };
      
      // Start recognition
      this.recognition.start();
      
      return { success: true, message: 'Speech recognition started' };
    } catch (error) {
      console.error('Speech recognition error:', error);
      this.isRecording = false;
      return { success: false, error: error.message };
    }
  }

  // Helper method to create a new recognition instance
  _createNewRecognition() {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
    
    // Set up event handlers
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.emit('stt-start', { status: 'listening' });
    };
    
    this.recognition.onresult = async (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (interimTranscript) {
        this.emit('stt-interim', { transcript: interimTranscript });
      }
      
      if (finalTranscript.trim()) {
        console.log('Final transcript:', finalTranscript);
        this.emit('stt-final', { transcript: finalTranscript });
        
        try {
          const response = await this.sendMessage(finalTranscript.trim());
        } catch (error) {
          console.error('Error processing speech:', error);
          this.emit('error', { error: error.message });
        }
      }
    };
    
    this.recognition.onerror = async (event) => {
      console.error('Speech recognition error:', event.error);
      this.emit('stt-error', { error: event.error });
      
      // Enhanced network error handling
      if (event.error === 'network') {
        await this._handleNetworkError();
        return;
      }
      
      // Auto-restart on recoverable errors (except during manual restart)
      const recoverableErrors = ['no-speech', 'audio-capture', 'aborted'];
      if (recoverableErrors.includes(event.error) && !this.isRestarting) {
        this.isRestarting = true;
        setTimeout(() => {
          if (this.isActive) {
            try {
              // Clean shutdown of current recognition
              if (this.recognition) {
                this.recognition.abort();
                this.recognition = null;
              }
              // Create fresh recognition instance
              this._createNewRecognition();
              console.log('Speech recognition restarted after error:', event.error);
            } catch (restartError) {
              console.error('Failed to restart speech recognition:', restartError);
            } finally {
              this.isRestarting = false;
            }
          } else {
            this.isRestarting = false;
          }
        }, 1500);
      }
    };
    
    this.recognition.onend = () => {
       console.log('Speech recognition ended');
       this.isRecording = false;
       this.emit('stt-end', { status: 'stopped' });
       
       if (this.isActive && !this.isRestarting) {
         setTimeout(() => {
           try {
             this.startSpeechRecognition();
           } catch (error) {
             console.log('Recognition restart failed:', error);
           }
         }, 100);
       }
     };
    
    this.recognition.start();
  }

  /**
   * Handle network errors with intelligent retry logic
   */
  async _handleNetworkError() {
    console.log('Handling network error...');
    
    // Check actual network connectivity
    const networkStatus = await networkUtils.getNetworkStatus();
    console.log('Network status:', networkStatus);
    
    if (!networkStatus.online) {
      // Device is offline - emit specific error and wait for reconnection
      this.emit('stt-error', { 
        error: 'offline', 
        message: 'Device is offline. Speech recognition will resume when connection is restored.',
        networkStatus 
      });
      
      // Set up network reconnection listener
      this._setupNetworkReconnectionListener();
      return;
    }
    
    // Device appears online but speech recognition failed
    // This could be due to poor connection quality or service issues
    if (networkStatus.quality === 'poor' || networkStatus.details.responseTime > 3000) {
      this.emit('stt-error', { 
        error: 'poor-connection', 
        message: 'Poor network connection detected. Speech recognition may be unreliable.',
        networkStatus 
      });
      
      // Implement exponential backoff for poor connections
      await this._retryWithBackoff();
    } else {
      // Good connection but service might be unavailable
      this.emit('stt-error', { 
        error: 'service-unavailable', 
        message: 'Speech recognition service temporarily unavailable. Retrying...',
        networkStatus 
      });
      
      // Standard retry for service issues
      await this._retryWithBackoff();
    }
  }

  /**
   * Set up listener for network reconnection
   */
  _setupNetworkReconnectionListener() {
    if (this._networkListener) return; // Already set up
    
    this._networkListener = async (event, data) => {
      if (event === 'online' && data.connected && this.isActive) {
        console.log('Network reconnected, attempting to resume speech recognition...');
        
        // Wait a moment for connection to stabilize
        setTimeout(async () => {
          try {
            if (!this.isRestarting && this.isActive) {
              this.isRestarting = true;
              
              // Clean shutdown of current recognition
              if (this.recognition) {
                this.recognition.abort();
                this.recognition = null;
              }
              
              // Create fresh recognition instance
              this._createNewRecognition();
              console.log('Speech recognition resumed after network reconnection');
              
              // Remove the listener as it's no longer needed
              networkUtils.removeListener(this._networkListener);
              this._networkListener = null;
            }
          } catch (error) {
            console.error('Failed to resume speech recognition after reconnection:', error);
          } finally {
            this.isRestarting = false;
          }
        }, 2000);
      }
    };
    
    networkUtils.addListener(this._networkListener);
  }

  /**
   * Retry speech recognition with exponential backoff
   */
  async _retryWithBackoff(attempt = 1, maxAttempts = 3) {
    if (attempt > maxAttempts || !this.isActive) {
      console.log('Max retry attempts reached or session inactive');
      return;
    }
    
    // Exponential backoff: 2s, 4s, 8s
    const delay = Math.pow(2, attempt) * 1000;
    console.log(`Retrying speech recognition in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
    
    setTimeout(async () => {
      try {
        // Test network connectivity before retry
        const isConnected = await networkUtils.testInternetConnectivity(5000);
        
        if (!isConnected) {
          console.log('Still no network connectivity, setting up reconnection listener');
          this._setupNetworkReconnectionListener();
          return;
        }
        
        if (!this.isRestarting && this.isActive) {
          this.isRestarting = true;
          
          // Clean shutdown of current recognition
          if (this.recognition) {
            this.recognition.abort();
            this.recognition = null;
          }
          
          // Create fresh recognition instance
          this._createNewRecognition();
          console.log(`Speech recognition restarted after network error (attempt ${attempt})`);
        }
      } catch (error) {
        console.error(`Retry attempt ${attempt} failed:`, error);
        
        // Try again with next backoff interval
        await this._retryWithBackoff(attempt + 1, maxAttempts);
      } finally {
        this.isRestarting = false;
      }
    }, delay);
  }

  // Stop speech recognition
  stopSpeechRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
      this.isRecording = false;
      this.emit('stt-stopped', {});
    }
  }

  // Event listener management
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  removeAllListeners(event) {
    if (event) {
      if (this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
    } else {
      Object.keys(this.eventListeners).forEach(key => {
        this.eventListeners[key] = [];
      });
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isSessionActive() {
    return this.isActive;
  }

  getSessionId() {
    return this.sessionId;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      isRecording: this.isRecording,
      isSpeaking: this.isSpeaking,
      isActive: this.isActive,
      sessionId: this.sessionId
    };
  }

  getStatus() {
    return {
      isActive: this.isActive,
      sessionId: this.sessionId,
      hasApiKey: !!this.apiKey,
      isInitialized: this.isInitialized,
      isConnected: this.isConnected,
      isRecording: this.isRecording,
      isSpeaking: this.isSpeaking
    };
  }

  // Configuration methods
  updateSettings(settings) {
    if (this.chat && settings.temperature !== undefined) {
      console.log('Updating live session settings:', settings);
    }
  }

  // Get conversation history
  getHistory() {
    if (this.chat && this.chat.history) {
      return this.chat.history;
    }
    return this.conversationHistory;
  }

  // Clear conversation history
  clearHistory() {
    if (this.chat) {
      this.chat = this.model.startChat({
        history: [],
        generationConfig: this.chat.generationConfig
      });
    }
    this.conversationHistory = [];
  }

  // Cleanup method
  cleanup() {
    this.endLiveSession();
    this.stopSpeechRecognition();
    this.stopSpeaking();
    this.removeAllListeners();
    
    // Clean up network listener
    if (this._networkListener) {
      networkUtils.removeListener(this._networkListener);
      this._networkListener = null;
    }
    
    this.conversationHistory = [];
    this.isInitialized = false;
    this.isConnected = false;
  }
}

// Create and export singleton instance
const modernGeminiLiveService = new ModernGeminiLiveService();
export default modernGeminiLiveService;