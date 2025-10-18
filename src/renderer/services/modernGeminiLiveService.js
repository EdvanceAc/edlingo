import supabaseGeminiService from './supabaseGeminiService.js';
import networkUtils from '../utils/networkUtils.js';
import supabaseConfig from '../config/supabaseConfig.js';

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
    this.isManualStop = false;
    this.shouldAutoRestart = true;
    this.isSpeaking = false;
    this.conversationHistory = [];
    this.isInitialized = false;
    this.isConnected = false;
    this._sttLastEmit = {};
  }

  // Initialize the service (API key optional when using Supabase)
  async initialize(apiKey) {
    try {
      // Store API key if provided (Supabase Edge Functions handle auth server-side)
      this.apiKey = apiKey || null;
      
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
      // Ensure initialized (but allow without API key when using Supabase)
      if (!this.isInitialized) {
        await this.initialize(this.apiKey);
      }

      if (this.isActive) {
        throw new Error('Live session already active');
      }

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

  // Send a message via Supabase Edge Function and get streaming response with automatic TTS
  async sendMessage(message, options = {}) {
    try {
      if (!this.isActive) {
        throw new Error('No active live session');
      }

      console.log('Sending message via Supabase Live Conversation:', message);

      // Send message through Supabase live conversation Edge Function
      const result = await supabaseGeminiService.sendLiveConversationMessage(message, {
        sessionId: this.sessionId,
        userLevel: options.userLevel || options.level,
        focusArea: options.focusArea || 'conversation',
        language: options.language || 'English',
        streaming: true
      });
      
      if (!result || !result.success || !result.stream) {
        console.warn('Live streaming unavailable; falling back to non-streaming Supabase chat');
        try {
          const nonStreaming = await supabaseGeminiService.sendMessage(message, {
            sessionId: this.sessionId,
            userLevel: options.userLevel || options.level,
            focusArea: options.focusArea || 'conversation',
            streaming: false
          });
          if (nonStreaming?.success && nonStreaming?.response) {
            const finalText = nonStreaming.response;
            // Emit final complete message
            this.emit('message', {
              type: 'text',
              content: finalText,
              isComplete: true,
              timestamp: new Date().toISOString(),
              audioData: null
            });
            console.log('Message sent successfully via non-streaming Supabase fallback');
            return { success: true, response: finalText, message: 'Message sent successfully (non-streaming fallback)' };
          }
        } catch (nsErr) {
          console.warn('Non-streaming Supabase fallback failed:', nsErr);
        }
        throw new Error('Supabase live conversation streaming failed');
      }
      
      let fullResponse = '';
      let audioData = null;
      let lastEmittedContent = '';
      let streamError = null;
      
      // Process streaming chunks with local error handling
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk?.chunk || chunk?.text || '';
          if (!chunkText && !chunk?.fullResponse && !chunk?.audioData) continue;
          fullResponse = chunk?.fullResponse || (fullResponse + (chunkText || ''));
          
          // Capture audio data from any chunk (including final)
          if (chunk?.audioData) {
            audioData = chunk.audioData;
            console.log('🎵 Zephyr audio data received from chunk:', {
              hasData: !!audioData.data,
              mimeType: audioData.mimeType,
              size: audioData.data?.length || 0
            });
          }
          
          // Check if this is the final chunk with audioData
          if (chunk?.done && chunk?.audioData) {
            audioData = chunk.audioData;
            console.log('🎵 Final Zephyr audio data received:', {
              hasData: !!audioData.data,
              mimeType: audioData.mimeType,
              size: audioData.data?.length || 0
            });
          }
          
          // Only emit streaming message if content has significantly changed
          if (fullResponse !== lastEmittedContent && fullResponse.length > lastEmittedContent.length + 5) {
            this.emit('message', {
              type: 'text',
              content: fullResponse,
              isComplete: false,
              chunk: chunkText,
              timestamp: new Date().toISOString()
            });
            lastEmittedContent = fullResponse;
          }
        }
      } catch (e) {
        console.error('Streaming parse error:', e);
        streamError = e;
      }

      // If streaming produced no content, attempt a direct Gemini fallback
      if (!fullResponse || !fullResponse.trim()) {
        try {
          const fb = await supabaseGeminiService.fallbackToDirectGemini(message, options);
          if (fb && fb.stream) {
            let fbFull = '';
            for await (const ch of fb.stream) {
              const t = ch?.chunk || ch?.text || '';
              if (t) fbFull += t;
            }
            if (fbFull && fbFull.trim()) {
              fullResponse = fbFull;
            }
          }
        } catch (fbErr) {
          console.warn('Direct Gemini fallback failed:', fbErr);
        }
      }

      // Always emit final complete message (this is the important one)
      this.emit('message', {
        type: 'text',
        content: fullResponse,
        isComplete: true,
        timestamp: new Date().toISOString(),
        audioData: audioData
      });

      // Don't auto-play TTS here - let the LiveConversation component handle it
      // This prevents duplicate TTS calls
      console.log('📤 Response processing completed, audioData available:', !!audioData);

      console.log('Message sent successfully via Supabase, response received');
      return { success: true, response: fullResponse, message: 'Message sent successfully' };
    } catch (error) {
      console.error('Failed to send message:', error);
      // Final attempt: non-streaming via Supabase (JSON) before giving up
      try {
        const nonStreaming = await supabaseGeminiService.sendMessage(message, {
          sessionId: this.sessionId,
          userLevel: options.userLevel || options.level,
          focusArea: options.focusArea || 'conversation',
          streaming: false
        });
        if (nonStreaming?.success && nonStreaming?.response) {
          const finalText = nonStreaming.response;
          this.emit('message', {
            type: 'text',
            content: finalText,
            isComplete: true,
            timestamp: new Date().toISOString(),
            audioData: null
          });
          console.log('Message sent successfully via non-streaming Supabase fallback (catch)');
          return { success: true, response: finalText, message: 'Message sent successfully (non-streaming fallback)' };
        }
      } catch (nsErr) {
        console.warn('Non-streaming Supabase fallback (catch) failed:', nsErr);
      }
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
      this.shouldAutoRestart = false;
      this.isManualStop = true;
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
    // Also stop any Zephyr audio
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    return { success: true };
  }

  // Add an audio unlock method to handle autoplay policies
  async unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        // No AudioContext available; still emit enabled for best-effort
        this.emit('audioEnabled');
        // Try replay queued audio if present
        if (this._queuedAudio) {
          try { await this._queuedAudio.play(); this._queuedAudio = null; } catch (e) { this.emit('audioError', { error: String(e) }); }
        }
        return { success: true, message: 'Audio unlocked without AudioContext' };
      }
      if (!this._audioCtx) this._audioCtx = new AC();
      if (this._audioCtx.state === 'suspended') {
        await this._audioCtx.resume();
      }
      // Play a silent buffer to satisfy user-gesture requirement
      const buffer = this._audioCtx.createBuffer(1, 1, 22050);
      const source = this._audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this._audioCtx.destination);
      source.start(0);
      source.stop(0);
      this.emit('audioEnabled');
      // Attempt to play any queued audio
      if (this._queuedAudio) {
        try {
          await this._queuedAudio.play();
          this._queuedAudio = null;
        } catch (e) {
          this.emit('audioError', { error: String(e) });
        }
      }
      return { success: true };
    } catch (e) {
      this.emit('audioError', { error: String(e) });
      return { success: false, error: String(e) };
    }
  }

  // Play Zephyr voice audio from Gemini
  async playZephyrAudio(audioData) {
    try {
      if (!audioData || !audioData.data) {
        console.warn('No audio data provided for Zephyr playback');
        return { success: false, error: 'No audio data' };
      }

      // Stop any current audio
      await this.stopSpeaking();

      // Convert base64 audio data to blob
      const audioBytes = atob(audioData.data);
      const audioArray = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { 
        type: audioData.mimeType || 'audio/wav' 
      });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      this.currentAudio = new Audio(audioUrl);
      this.isSpeaking = true;

      // Set up event handlers
      this.currentAudio.onplay = () => {
        console.log('🎙️ Zephyr voice started playing');
        this.emit('tts-start', { type: 'zephyr-audio' });
      };

      this.currentAudio.onended = () => {
        console.log('🎙️ Zephyr voice finished playing');
        this.isSpeaking = false;
        this.emit('tts-end', { type: 'zephyr-audio' });
        this.emit('speechEnd');
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
      };

      this.currentAudio.onerror = (error) => {
        console.error('🚨 Zephyr audio playback error:', error);
        this.isSpeaking = false;
        this.emit('tts-error', { error: 'zephyr-audio-playback-failed' });
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
      };

      // Attempt to play
      try {
        await this.currentAudio.play();
      } catch (err) {
        // Autoplay restrictions typically throw NotAllowedError/DOMException
        const msg = String(err?.message || err);
        if ((err && (err.name === 'NotAllowedError' || err.name === 'DOMException')) || msg.toLowerCase().includes('gesture')) {
          console.warn('Autoplay blocked. Queuing audio until user enables playback.');
          this._queuedAudio = this.currentAudio;
          this.emit('audioQueued', { message: 'Audio blocked by browser policy. Click Enable audio.' });
          return { success: false, error: 'autoplay-blocked' };
        }
        // Other errors
        throw err;
      }
      
      return { success: true, type: 'zephyr-audio' };
    } catch (error) {
      console.error('Failed to play Zephyr audio:', error);
      this.isSpeaking = false;
      this.emit('tts-error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Enhanced Speech-to-Text functionality
  async startRecording() {
    // Prefer Web Speech API; if unsupported or repeatedly failing, fall back to edge transcription
    try {
      const supportsWebSpeech = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
      if (!supportsWebSpeech) {
        return await this._startEdgeTranscription();
      }
      return await this.startSpeechRecognition();
    } catch (error) {
      console.warn('Web Speech start failed, falling back to Edge transcription:', error);
      return await this._startEdgeTranscription();
    }
  }

  async stopRecording() {
    try { this.stopSpeechRecognition(); } catch {}
    this._stopEdgeTranscription?.();
    return { success: true };
  }

  async startSpeechRecognition(options = {}) {
    try {
      if (this.isRecording) {
        return { success: true, message: 'Speech recognition already started' };
      }
      this.isManualStop = false;
      this.shouldAutoRestart = true;
      // Check browser compatibility
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        // Fall back to Edge transcription silently
        return await this._startEdgeTranscription(options);
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
        // Ignore 'aborted' if triggered by manual stop or internal restart
        if (event.error === 'aborted' && (this.isManualStop || this.isRestarting)) {
          return;
        }

        // Enhanced network error handling: flag restart and defer to backoff
        if (event.error === 'network' || event.error === 'service-not-allowed' || event.error === 'network-not-available') {
          this.isRestarting = true;
          this.shouldAutoRestart = false; // prevent onend auto-restart
          try {
            if (this.recognition) this.recognition.stop();
          } catch {}
          await this._handleNetworkError();
          // If network is fine but service keeps failing, fall back
          const status = await networkUtils.getNetworkStatus();
          if (status.online && (status.quality === 'excellent' || status.quality === 'good')) {
            console.log('Falling back to Edge transcription due to service error');
            await this._startEdgeTranscription(options);
            return;
          }
          return;
        }

        // Auto-restart on recoverable errors by stopping and letting onend restart
        const recoverableErrors = ['no-speech', 'audio-capture', 'aborted'];
        if (this.shouldAutoRestart && recoverableErrors.includes(event.error)) {
          if (!this.isRestarting) {
            this.isRestarting = true;
            try {
              if (this.recognition) {
                this.recognition.stop();
              }
            } catch (restartError) {
              console.error('Failed to stop recognition for restart:', restartError);
              this.isRestarting = false;
            }
          }
          // Do not emit error for recoverable 'aborted' to avoid noisy UI
          if (event.error === 'aborted') return;
        }

        const severity = (event.error === 'no-speech' || event.error === 'audio-capture') ? 'warning' : 'error';
        const message = event.error === 'no-speech'
          ? 'No speech detected. Still listening...'
          : (event.error === 'audio-capture' ? 'No microphone input detected.' : undefined);
        this._emitSttEvent(event.error, message, severity);
      };
      
      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.isRecording = false;
        this.emit('stt-end', { status: 'stopped' });
        
        // Auto-restart if session is still active and not already restarting
        if (this.isActive && !this.isRestarting && this.shouldAutoRestart && !this.isManualStop) {
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
      // Ignore 'aborted' if triggered by manual stop or internal restart
      if (event.error === 'aborted' && (this.isManualStop || this.isRestarting)) {
        return;
      }

      // Enhanced network error handling: flag restart and defer to backoff
      if (event.error === 'network') {
        this.isRestarting = true;
        this.shouldAutoRestart = false; // prevent onend auto-restart
        try {
          if (this.recognition) this.recognition.stop();
        } catch {}
        await this._handleNetworkError();
        return;
      }

      // Auto-restart on recoverable errors by stopping and letting onend restart
      const recoverableErrors = ['no-speech', 'audio-capture', 'aborted'];
      if (this.shouldAutoRestart && recoverableErrors.includes(event.error)) {
        if (!this.isRestarting) {
          this.isRestarting = true;
          try {
            if (this.recognition) {
              this.recognition.stop();
            }
          } catch (restartError) {
            console.error('Failed to stop recognition for restart:', restartError);
            this.isRestarting = false;
          }
        }
        if (event.error === 'aborted') return;
      }

      const severity = (event.error === 'no-speech' || event.error === 'audio-capture') ? 'warning' : 'error';
      const message = event.error === 'no-speech'
        ? 'No speech detected. Still listening...'
        : (event.error === 'audio-capture' ? 'No microphone input detected.' : undefined);
      this._emitSttEvent(event.error, message, severity);
    };
    
    this.recognition.onend = () => {
       console.log('Speech recognition ended');
       this.isRecording = false;
       this.emit('stt-end', { status: 'stopped' });
       
       if (this.isActive && !this.isRestarting && this.shouldAutoRestart && !this.isManualStop) {
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
      // Device is offline - emit specific warning and wait for reconnection
      this._emitSttEvent('offline',
        'Device is offline. Speech recognition will resume when connection is restored.',
        'warning');

      // Set up network reconnection listener
      this._setupNetworkReconnectionListener();
      return;
    }

    // Device appears online but speech recognition failed
    // This could be due to poor connection quality or service issues
    if (networkStatus.quality === 'poor' || networkStatus.details.responseTime > 3000) {
      this._emitSttEvent('poor-connection',
        'Poor network connection detected. Speech recognition may be unreliable.',
        'warning');

      // Implement exponential backoff for poor connections
      await this._retryWithBackoff();
    } else {
      // Good connection but service might be unavailable
      this._emitSttEvent('service-unavailable',
        'Speech recognition service temporarily unavailable. Retrying...',
        'warning');

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

              // Create fresh recognition instance using proper start method
              try {
                await this.startSpeechRecognition();
                console.log('Speech recognition resumed after network reconnection');

                // Remove the listener as it's no longer needed
                networkUtils.removeListener(this._networkListener);
                this._networkListener = null;
              } catch (startError) {
                console.error('Failed to resume speech recognition after reconnection:', startError);
              }
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

          // Create fresh recognition instance using proper start method
          try {
            await this.startSpeechRecognition();
            console.log(`Speech recognition restarted after network error (attempt ${attempt})`);
          } catch (startError) {
            console.error('Failed to restart speech recognition:', startError);
          }
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
      this.isManualStop = true;
      this.shouldAutoRestart = false;
      this.recognition.stop();
      this.recognition = null;
      this.isRecording = false;
      this.emit('stt-stopped', {});
    }
  }

  /**
   * Edge Function-based transcription fallback
   * Records short chunks via MediaRecorder and sends to Supabase function `transcribe-audio`.
   */
  async _startEdgeTranscription(options = {}) {
    try {
      // Resolve Supabase base URL once
      const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
        || (typeof window !== 'undefined' && (window.__ENV__?.VITE_SUPABASE_URL || window.ENV?.SUPABASE_URL));
      const baseUrl = envUrl || (typeof window !== 'undefined' ? (window.supabaseUrl || '') : '');

      // Guard when not configured
      if (!baseUrl) {
        console.warn('Edge transcription disabled: SUPABASE_URL not configured');
        this._emitSttEvent('edge-transcription-unavailable',
          'Transcription service not configured. Falling back to text-only live conversation.',
          'warning');
        return { success: false, error: 'edge-transcription-unavailable' };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      let chunks = [];
      let debounceTimer = null;
      let pendingText = '';
      const FLUSH_DELAY_MS = 1200; // consider speech ended after 1.2s pause
      const stopAll = () => {
        try { mediaRecorder.stop(); } catch {}
        stream.getTracks().forEach(t => t.stop());
        this._stopEdgeTranscription = undefined;
        this.emit('stt-end', { status: 'stopped' });
      };
      this._stopEdgeTranscription = stopAll;

      mediaRecorder.onstart = () => {
        this.emit('stt-start', { status: 'listening' });
      };
      mediaRecorder.ondataavailable = async (e) => {
        chunks.push(e.data);
        if (e.data && e.data.size > 0) {
          const blob = new Blob(chunks, { type: mimeType });
          chunks = [];
          try {
            const formData = new FormData();
            formData.append('audio', blob, 'chunk.webm');
            formData.append('language', options.language || 'en-US');
            // Ensure auth token (user session or anon key)
            try { await supabaseGeminiService.initialize(); } catch {}
            let authToken = '';
            try {
              const { data: { session } } = await supabaseGeminiService.supabase.auth.getSession();
              authToken = session?.access_token || '';
            } catch {}
            if (!authToken) {
              // fall back to anon key from env/config
              authToken = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY)
                || supabaseConfig?.anonKey
                || (typeof window !== 'undefined' && (window.__ENV__?.VITE_SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || window.supabaseAnonKey))
                || '';
            }

            const resp = await fetch(`${baseUrl}/functions/v1/transcribe-audio`, {
              method: 'POST',
              body: formData,
              headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined
            });
            if (resp.ok) {
              const j = await resp.json();
              const text = j.text?.trim();
              if (text) {
                // Coalesce incremental text; emit interim and debounce final send
                pendingText = pendingText ? `${pendingText} ${text}` : text;
                this.emit('stt-interim', { transcript: pendingText });
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                  const finalText = pendingText.trim();
                  pendingText = '';
                  this.emit('stt-final', { transcript: finalText });
                  try { await this.sendMessage(finalText); } catch {}
                }, FLUSH_DELAY_MS);
              }
            } else if (resp.status === 404) {
              // Function missing in project — stop edge transcription gracefully
              console.warn('Edge transcription function not found (404). Disabling edge fallback.');
              this._emitSttEvent('edge-function-missing',
                'Transcription function not deployed. Live conversation continues without STT fallback.',
                'warning');
              stopAll();
              return;
            }
          } catch (err) {
            console.warn('Edge transcription error:', err);
          }
        }
      };
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e.error || e);
        this.emit('stt-error', { error: 'media-recorder', message: String(e.error || e), severity: 'warning' });
      };
      mediaRecorder.onstop = () => {
        this.emit('stt-end', { status: 'stopped' });
      };

      mediaRecorder.start(2000); // 2s chunks
      this.isRecording = true;
      return { success: true, message: 'Edge transcription started' };
    } catch (err) {
      console.error('Failed to start Edge transcription:', err);
      this.emit('stt-error', { error: 'edge-transcription-failed', message: String(err), severity: 'error' });
      return { success: false, error: String(err) };
    }
  }

  // Internal helper to emit stt-error with throttling/coalescing
  _emitSttEvent(error, message, severity = 'error') {
    const key = `${error}`;
    const now = Date.now();
    const last = this._sttLastEmit[key] || 0;
    // Throttle to once per 3s per error type
    if (now - last < 3000) return;
    this._sttLastEmit[key] = now;
    this.emit('stt-error', { error, message, severity });
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