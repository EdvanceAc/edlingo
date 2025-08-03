// Modern Gemini Live Service wrapper for React components
import { 
  GoogleGenAI, 
  LiveServerMessage, 
  MediaResolution, 
  Modality, 
  Session, 
} from '@google/genai';
// Simple EventEmitter implementation for browser compatibility
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('EventEmitter error:', error);
      }
    });
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

class ModernGeminiLiveService extends EventEmitter {
  constructor() {
    super();
    
    this.session = null;
    this.isInitialized = false;
    this.sessionActive = false;
    this.apiKey = null;
    this.responseQueue = [];
    this.audioParts = [];
    this.userHasInteracted = false;
    
    // Configuration
    this.model = 'models/gemini-2.0-flash-exp';
    this.voiceName = 'Zephyr';
    this.systemInstruction = 'You are a helpful language learning assistant.';
    
    // Audio context for speech recognition
    this.audioContext = null;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.isRecording = false;
    
    // TTS audio context
    this.audioElement = null;
    
    // Cleanup flags to prevent recursive calls
    this._settingUpAudio = false;
    this._stoppingAudio = false;
    this._processingStop = false;
    this._endingSession = false;
    
    // Set up user interaction detection
    this.setupUserInteractionDetection();
  }

  setupUserInteractionDetection() {
    const events = ['click', 'touchstart', 'keydown'];
    const handleInteraction = () => {
      this.userHasInteracted = true;
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });
  }

  async initialize(apiKey, options = {}) {
    try {
      this.apiKey = apiKey;
      this.model = options.model || this.model;
      this.voiceName = options.voiceName || this.voiceName;
      this.systemInstruction = options.systemInstruction || this.systemInstruction;
      
      this.isInitialized = true;
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize modern service:', error);
      return { success: false, error: error.message };
    }
  }

  handleMessage(message) {
    try {
      if (message.serverContent?.modelTurn?.parts) {
        const parts = message.serverContent.modelTurn.parts;
        
        for (const part of parts) {
          // Handle file data
          if (part.fileData) {
            console.log(`File: ${part.fileData.fileUri}`);
            this.emit('fileData', part.fileData);
          }

          // Handle inline audio data
          if (part.inlineData) {
            const inlineData = part.inlineData;
            this.audioParts.push(inlineData.data || '');
          }

          // Handle text responses
          if (part.text) {
            console.log('AI Response:', part.text);
            this.emit('message', {
              type: 'text',
              content: part.text,
              isComplete: true,
              timestamp: Date.now()
            });
          }
        }
      }

      // Handle turn completion
      if (message.serverContent?.turnComplete) {
        if (this.audioParts.length > 0) {
          // Convert accumulated audio parts to WAV
          const buffer = this.convertToWav(this.audioParts, 'audio/webm;codecs=opus');
          this.handleAudioResponse({ buffer });
        }
        // Clear audio parts when turn is complete to prevent accumulation
        this.audioParts = [];
        this.emit('turn-complete');
      }

      // Handle interruptions
      if (message.serverContent?.interrupted) {
        this.emit('interrupted');
      }

    } catch (error) {
      console.error('Error handling message:', error);
      this.emit('error', { error: error.message || error });
    }
  }

  async startLiveSession(options = {}) {
    if (!this.isInitialized || !this.apiKey) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      this.session = await ai.live.connect({
        model: this.model,
        callbacks: {
          onopen: () => {
            console.debug('Gemini Live session opened');
            this.sessionActive = true;
            this.emit('connected');
          },
          onmessage: (message) => {
            this.responseQueue.push(message);
            this.handleMessage(message);
          },
          onerror: (e) => {
            console.debug('Gemini Live error:', e.message);
            this.emit('error', { error: e.message });
          },
          onclose: (e) => {
            console.debug('Gemini Live session closed:', e.reason);
            this.sessionActive = false;
            this.emit('close', { reason: e.reason });
          },
        }
      });
      
      // Set up audio recording if microphone is enabled
      if (options.autoStartSTT) {
        await this.setupAudioRecording();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to start live session:', error);
      return { success: false, error: error.message };
    }
  }

  async setupAudioRecording() {
    try {
      // Prevent multiple simultaneous setups
      if (this._settingUpAudio) {
        console.log('Audio setup already in progress, waiting...');
        return;
      }
      
      // If already set up and working, don't set up again
      if (this.mediaRecorder && this.audioStream) {
        console.log('Audio recording already set up');
        return;
      }
      
      this._settingUpAudio = true;
      
      console.log('Requesting microphone access...');
      
      // Clean up any existing setup first
      await this.cleanupAudioResources();
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser');
      }
      
      // Get user media for audio recording
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });
      
      console.log('Microphone access granted');

      // Set up audio context for processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });

      // Set up media recorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      let audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Prevent recursive calls with multiple checks
        if (this._processingStop) {
          console.log('Already processing stop event, skipping...');
          return;
        }
        
        // Additional check: ensure we have a valid mediaRecorder reference
        if (!this.mediaRecorder) {
          console.log('MediaRecorder already cleaned up, skipping onstop...');
          return;
        }
        
        this._processingStop = true;
        
        // Set a timeout to automatically reset the flag in case of issues
        const resetTimeout = setTimeout(() => {
          if (this._processingStop) {
            console.warn('Force resetting _processingStop flag due to timeout');
            this._processingStop = false;
          }
        }, 5000); // 5 second timeout
        
        try {
          if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // Convert to base64 in chunks to prevent stack overflow
            const base64Audio = await this.arrayBufferToBase64(arrayBuffer);
            
            // Send audio to session
            if (this.session && this.sessionActive) {
              this.session.sendClientContent({
                turns: [{
                  parts: [{
                    inlineData: {
                      mimeType: 'audio/webm;codecs=opus',
                      data: base64Audio
                    }
                  }]
                }]
              });
              this.emit('stt-final', { transcript: '[Audio sent to AI]' });
            } else {
              throw new Error('Session not active');
            }
          }
          audioChunks = [];
          this.isRecording = false;
          this.emit('stt-end');
        } catch (error) {
          console.error('Error in onstop handler:', error);
          this.emit('stt-error', { error: error.message });
        } finally {
          clearTimeout(resetTimeout);
          this._processingStop = false;
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.emit('stt-start');
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.emit('stt-error', { error: error.message || 'Recording error' });
      };

    } catch (error) {
      console.error('Failed to setup audio recording:', error);
      
      let errorMessage = error.message;
      
      // Provide more specific error messages for common issues
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone does not support the required audio settings.';
      }
      
      this.emit('stt-error', { error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      this._settingUpAudio = false;
    }
  }
  
  async cleanupAudioResources() {
    try {
      // Clear any existing media recorder
      if (this.mediaRecorder) {
        // Remove event listeners BEFORE stopping to prevent recursive calls
        const wasRecording = this.mediaRecorder.state === 'recording';
        
        // Remove event listeners first to prevent any callbacks
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.onstart = null;
        this.mediaRecorder.onerror = null;
        
        // Now safely stop if it was recording
        if (wasRecording) {
          try {
            this.mediaRecorder.stop();
          } catch (stopError) {
            console.warn('Error stopping media recorder:', stopError);
          }
        }
        
        this.mediaRecorder = null;
      }
      
      // Stop audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (trackError) {
            console.warn('Error stopping audio track:', trackError);
          }
        });
        this.audioStream = null;
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try {
          await this.audioContext.close();
        } catch (contextError) {
          console.warn('Error closing audio context:', contextError);
        }
        this.audioContext = null;
      }
      
      // Reset flags
      this.isRecording = false;
      this._processingStop = false;
    } catch (error) {
      console.error('Error cleaning up audio resources:', error);
    }
  }

  async sendMessage(text) {
    try {
      if (!this.session || !this.sessionActive) {
        throw new Error('Session not active');
      }

      this.session.sendClientContent({
        turns: [{
          parts: [{
            text: text
          }]
        }]
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }
  }

  async startRecording() {
    try {
      if (!this.mediaRecorder) {
        console.log('Setting up audio recording...');
        await this.setupAudioRecording();
        
        // Check if setup was successful
        if (!this.mediaRecorder) {
          throw new Error('Failed to initialize microphone. Please check permissions.');
        }
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        console.log('Starting microphone recording...');
        this.mediaRecorder.start(1000); // Record in 1-second chunks
        return { success: true };
      } else {
        throw new Error('Microphone is not available or already recording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emit('stt-error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async stopRecording() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: error.message };
    }
  }

  async stopAudioRecording() {
    try {
      // Prevent multiple simultaneous calls
      if (this._stoppingAudio) {
        return { success: true };
      }
      this._stoppingAudio = true;

      // Use the centralized cleanup method
      await this.cleanupAudioResources();
      
      this._stoppingAudio = false;
      return { success: true };
    } catch (error) {
      this._stoppingAudio = false;
      console.error('Failed to stop audio recording:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAudioResponse(audioData) {
    try {
      // Create audio blob from the converted WAV data
      const audioBlob = new Blob([audioData.buffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      if (this.audioElement) {
        this.audioElement.pause();
        URL.revokeObjectURL(this.audioElement.src);
      }
      
      this.audioElement = new Audio(audioUrl);
      
      // Check if user has interacted before attempting to play
      if (!this.userHasInteracted) {
        console.warn('Audio playback requires user interaction. Audio will be queued.');
        this.emit('audio-queued', {
          type: 'audio',
          audioUrl,
          timestamp: Date.now(),
          message: 'Click anywhere to enable audio playback'
        });
        
        // Set up one-time click handler to play audio
        const playAudio = () => {
          this.audioElement.play().catch(error => {
            console.error('Audio playback failed:', error);
            this.emit('audio-error', { error: error.message });
          });
          document.removeEventListener('click', playAudio);
        };
        document.addEventListener('click', playAudio, { once: true });
      } else {
        this.audioElement.play().catch(error => {
          console.error('Audio playback failed:', error);
          this.emit('audio-error', { error: error.message });
        });
      }
      
      // Emit audio event
      this.emit('audio', {
        type: 'audio',
        audioUrl,
        timestamp: Date.now()
      });
      
      // Clean up URL after playback
      this.audioElement.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
      
    } catch (error) {
      console.error('Failed to handle audio response:', error);
      this.emit('error', { error: error.message });
    }
  }

  // Helper method to convert ArrayBuffer to base64 in chunks to prevent stack overflow
  async arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 1024; // Use smaller chunks to prevent stack overflow
    let binaryString = '';
    
    // Convert to binary string in small chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, bytes.length);
      const chunk = bytes.slice(i, end);
      
      // Process even smaller sub-chunks to be extra safe
      let chunkString = '';
      for (let j = 0; j < chunk.length; j += 512) {
        const subChunk = chunk.slice(j, Math.min(j + 512, chunk.length));
        chunkString += String.fromCharCode.apply(null, subChunk);
      }
      
      binaryString += chunkString;
      
      // Yield control to prevent blocking the main thread
      if (i % (chunkSize * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Convert the entire binary string to base64
    return btoa(binaryString);
  }

  // Audio conversion methods
  convertToWav(rawData, mimeType) {
    const options = this.parseMimeType(mimeType);
    
    // Convert base64 data to Uint8Arrays
    const audioBuffers = rawData.map(data => {
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    });
    
    // Calculate total length
    const dataLength = audioBuffers.reduce((total, buffer) => total + buffer.length, 0);
    const wavHeader = this.createWavHeader(dataLength, options);
    
    // Combine header and audio data
    const result = new Uint8Array(wavHeader.length + dataLength);
    result.set(wavHeader, 0);
    
    let offset = wavHeader.length;
    for (const buffer of audioBuffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    
    return result;
  }

  parseMimeType(mimeType) {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options = {
      numChannels: 1,
      bitsPerSample: 16,
      sampleRate: 24000
    };

    if (format && format.startsWith('L')) {
      const bits = parseInt(format.slice(1), 10);
      if (!isNaN(bits)) {
        options.bitsPerSample = bits;
      }
    }

    for (const param of params) {
      const [key, value] = param.split('=').map(s => s.trim());
      if (key === 'rate') {
        options.sampleRate = parseInt(value, 10);
      }
    }

    return options;
  }

  createWavHeader(dataLength, options) {
    const {
      numChannels,
      sampleRate,
      bitsPerSample,
    } = options;

    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    // RIFF header
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + dataLength, true); // ChunkSize
    view.setUint32(8, 0x57415645, false); // 'WAVE'
    
    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true); // Subchunk1Size (PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample
    
    // data chunk
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, dataLength, true); // Subchunk2Size

    return new Uint8Array(buffer);
  }

  async playTTS(text) {
    // For compatibility with existing interface
    // The modern service handles TTS automatically
    return { success: true };
  }

  enableAudio() {
    // Method to manually enable audio after user interaction
    this.userHasInteracted = true;
    this.emit('audio-enabled');
    return { success: true };
  }

  async initializeAudioContext() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleSpeechRecognition(options = {}) {
    try {
      if (this.isRecording) {
        await this.stopRecording();
        return { success: true, status: 'stopped', recording: false };
      } else {
        await this.startRecording();
        return { success: true, status: 'started', recording: true };
      }
    } catch (error) {
      console.error('Failed to toggle speech recognition:', error);
      return { success: false, error: error.message };
    }
  }

  stopTTS() {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }
      this.emit('tts-end');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop TTS:', error);
      return { success: false, error: error.message };
    }
  }

  async endLiveSession() {
    try {
      if (this.session && this.sessionActive) {
        this.session.close();
        this.session = null;
      }
      
      // Clean up audio recording
      await this.stopAudioRecording();
      
      // Clear audio parts and response queue
      this.audioParts = [];
      this.responseQueue = [];
      
      this.sessionActive = false;
      
      return { success: true };
    } catch (error) {
      console.error('Failed to end live session:', error);
      return { success: false, error: error.message };
    }
  }

  async endSession() {
    try {
      // Prevent multiple simultaneous calls
      if (this._endingSession) {
        return { success: true };
      }
      this._endingSession = true;

      // Close session first to prevent new messages
      if (this.session && this.sessionActive) {
        this.session.close();
        this.session = null;
      }
      this.sessionActive = false;

      // Use centralized cleanup for audio resources
      await this.cleanupAudioResources();

      // Clear other resources
      this.audioElement = null;
      this.audioParts = [];
      this.responseQueue = [];
      
      // Reset all cleanup flags
      this._settingUpAudio = false;
      this._stoppingAudio = false;
      this._processingStop = false;
      
      this._endingSession = false;
      return { success: true };
    } catch (error) {
      this._endingSession = false;
      console.error('Failed to end session:', error);
      return { success: false, error: error.message };
    }
  }

  isSessionActive() {
    return this.sessionActive;
  }

  // Compatibility methods
  on(event, listener) {
    super.on(event, listener);
  }

  off(event, listener) {
    super.off(event, listener);
  }

  emit(event, ...args) {
    super.emit(event, ...args);
  }
}

// Create singleton instance
const modernGeminiLiveService = new ModernGeminiLiveService();

export default modernGeminiLiveService;