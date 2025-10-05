import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiLiveService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.chat = null;
    this.isActive = false;
    this.sessionId = null;
    this.eventListeners = {
      message: [],
      error: [],
      close: []
    };
    this.apiKey = null;
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

      console.log('Gemini Live Service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Gemini Live Service:', error);
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
          this.playTTS(fullResponse, {
            rate: 0.9,
            pitch: 1.0,
            volume: 0.8
          });
        }, 100); // Small delay to ensure UI updates first
      }

      console.log('Message sent successfully, response received');
      return { success: true, response: fullResponse };
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit('error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Send audio data (for future voice input support)
  async sendAudio(audioData, options = {}) {
    try {
      if (!this.isActive) {
        throw new Error('No active live session');
      }

      // For now, we'll convert audio to text using Web Speech API
      // In the future, this could use Gemini's audio capabilities
      console.log('Audio input received, converting to text...');
      
      // Placeholder for audio-to-text conversion
      // This would need to be implemented with actual speech recognition
      const transcribedText = await this.transcribeAudio(audioData);
      
      if (transcribedText) {
        return await this.sendMessage(transcribedText, options);
      }
      
      return { success: false, error: 'Failed to transcribe audio' };
    } catch (error) {
      console.error('Failed to send audio:', error);
      this.emit('error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Placeholder for audio transcription
  async transcribeAudio(audioData) {
    // This would implement actual speech-to-text
    // For now, return null to indicate not implemented
    console.log('Audio transcription not yet implemented');
    return null;
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
      this.stopTTS();

      this.isActive = false;
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

  getStatus() {
    return {
      isActive: this.isActive,
      sessionId: this.sessionId,
      hasApiKey: !!this.apiKey,
      isInitialized: !!this.model
    };
  }

  // Configuration methods
  updateSettings(settings) {
    if (this.chat && settings.temperature !== undefined) {
      // Update generation config if needed
      console.log('Updating live session settings:', settings);
    }
  }

  // Get conversation history
  getHistory() {
    if (this.chat && this.chat.history) {
      return this.chat.history;
    }
    return [];
  }

  // Clear conversation history
  clearHistory() {
    if (this.chat) {
      this.chat = this.model.startChat({
        history: [],
        generationConfig: this.chat.generationConfig
      });
    }
  }

  // Enhanced Text-to-Speech functionality with realistic voices
  async playTTS(text, options = {}) {
    try {
      if (!text) return { success: false, error: 'No text provided' };
      
      // Stop any current speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      // Use Web Speech API for TTS
      if ('speechSynthesis' in window) {
        // Wait for voices to load
        await this.waitForVoices();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Determine rate based on CEFR level
        let rate = options.rate || 0.9;
        if (options.cefrLevel) {
          switch (options.cefrLevel.toLowerCase()) {
            case 'a1':
            case 'basic':
              rate = 0.7;
              break;
            case 'a2':
            case 'elementary':
              rate = 0.8;
              break;
            case 'b1':
            case 'pre-intermediate':
              rate = 0.9;
              break;
            case 'b2':
            case 'intermediate':
              rate = 1.0;
              break;
            case 'c1':
            case 'upper-intermediate':
              rate = 1.1;
              break;
            case 'c2':
            case 'advanced':
              rate = 1.2;
              break;
            default:
              rate = 0.9;
          }
        }
        
        utterance.rate = rate;
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
          this.emit('tts-end', { text });
        };
        
        utterance.onerror = (error) => {
          console.error('TTS error:', error);
          this.emit('tts-error', { error: error.error });
        };
        
        // Speak the text
        speechSynthesis.speak(utterance);
        
        return new Promise((resolve) => {
          utterance.onend = () => resolve({ success: true });
          utterance.onerror = (error) => resolve({ success: false, error: error.error });
        });
      } else {
        throw new Error('Speech synthesis not supported');
      }
    } catch (error) {
      console.error('TTS error:', error);
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
  
  // Get available voices
  getAvailableVoices() {
    return speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('en'));
  }
  
  // Stop current TTS
  stopTTS() {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      this.emit('tts-stopped', {});
    }
  }

  // Enhanced Speech-to-Text functionality with continuous listening
  async startSpeechRecognition(options = {}) {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported');
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition for real-time conversation
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.language || 'en-US';
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
            // TTS will be handled by the message event listener
          } catch (error) {
            console.error('Error processing speech:', error);
            this.emit('error', { error: error.message });
          }
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.emit('stt-error', { error: event.error });
        
        // Auto-restart on certain errors
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          setTimeout(() => {
            if (this.recognition && this.isActive) {
              this.recognition.start();
            }
          }, 1000);
        }
      };
      
      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.emit('stt-end', { status: 'stopped' });
        
        // Auto-restart if session is still active
        if (this.isActive && this.recognition) {
          setTimeout(() => {
            try {
              this.recognition.start();
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
      return { success: false, error: error.message };
    }
  }

  // Stop speech recognition
  stopSpeechRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
      this.emit('stt-stopped', {});
    }
  }
  
  // Toggle speech recognition
  toggleSpeechRecognition(options = {}) {
    if (this.recognition) {
      this.stopSpeechRecognition();
      return { success: true, status: 'stopped' };
    } else {
      return this.startSpeechRecognition(options);
    }
  }
  
  // Check if speech recognition is active
  isSpeechRecognitionActive() {
    return !!this.recognition;
  }

  // Start session (alias for startLiveSession for compatibility)
  async startSession(options = {}) {
    return await this.startLiveSession(options);
  }

  // End session (alias for endLiveSession for compatibility)
  async endSession() {
    return await this.endLiveSession();
  }

  // Message event handler (for compatibility)
  onMessage(callback) {
    this.on('message', callback);
  }

  // Error event handler (for compatibility)
  onError(callback) {
    this.on('error', callback);
  }

  // Close event handler (for compatibility)
  onClose(callback) {
    this.on('close', callback);
  }
}

// Create and export a singleton instance
const geminiLiveService = new GeminiLiveService();
export default geminiLiveService;

class GeminiLiveService {
  constructor() {
    this.model = null;
    this.chat = null;
    this.stt = null;
    this.tts = null;
    this.isSpeaking = false;
    this.isListening = false;
    this.currentUtterance = null;
    this.onMessageCallback = null;
    this.onErrorCallback = null;
    this.onStatusChange = null;
    this.systemInstruction = `You are an AI language tutor in the EdLingo app, designed to teach English based on a unified proficiency system combining Flesch-Kincaid readability and CEFR levels. Your goal is to communicate effectively with users by adapting your responses to their assigned grade level. Always assess the user's level first and tailor your language, explanations, examples, and questions accordingly. Do not overwhelm beginners or bore advanced learners—keep interactions engaging, supportive, and progressive.

### Core Rules for All Interactions:
- **Identify User Level**: At the start of each conversation, confirm or infer the user's level (Basic, Elementary, Pre-Intermediate, Intermediate, Upper-Intermediate, or Advanced). If unknown, ask politely: \"What's your current English level? For example, Beginner or Advanced?\"
- **Content Type Differentiation**:
  - If the interaction is casual conversation or simple practice, treat it as 'Basic' level (no complex metrics needed).
  - For structured lessons, exercises, or explanations, use the Elementary to Advanced levels with corresponding Flesch-Kincaid ranges.
- **Response Structure**:
  - Start with a clear, level-appropriate greeting or recap.
  - Explain concepts simply, then build complexity if needed.
  - End with a question or task to encourage practice.
  - Keep responses concise: Aim for 100-300 words, depending on level.
- **General Guidelines**:
  - Use positive reinforcement: \"Great job!\" or \"Let's try that again.\"
  - Correct errors gently, focusing on one issue at a time.
  - Incorporate cultural neutrality and inclusivity.
  - If the user's input doesn't match their level, suggest adjustments: \"This seems advanced for your level—shall we simplify?\"

### Level-Specific Communication Guidelines:
Follow these strictly based on the user's level. Adjust vocabulary size, sentence complexity, and teaching depth:

- **Basic (CEFR: A1, No Flesch-Kincaid calculation)**:
  - Usage: General conversation and simple sentences only.
  - Style: Very simple present tense, basic vocabulary (top 500 common words like \"hello,\" \"eat,\" \"house\"). Short sentences (5-10 words max). Focus on everyday exchanges, greetings, and basic questions.
  - Examples: \"Hello! How are you today? I am fine.\" Teach through repetition and role-play.
  - Avoid: Complex grammar, idioms, or abstract topics.

- **Elementary (CEFR: A2, Flesch-Kincaid: 0 to 1)**:
  - Usage: Structured learning content.
  - Style: Simple past and present tenses, basic connectors (and, but), vocabulary from first 1,000 common words. Sentences 8-12 words. Introduce basic descriptions and routines.
  - Examples: \"Yesterday, I went to the store. What did you do?\" Use pictures or simple stories for context.
  - Avoid: Advanced tenses or specialized terms.

- **Pre-Intermediate (CEFR: B1, Flesch-Kincaid: 1 to 1.5)**:
  - Usage: Structured learning content.
  - Style: Future tense, simple conditionals, intermediate vocabulary (1,000-2,000 words). Sentences 10-15 words. Discuss opinions and plans.
  - Examples: \"If it rains tomorrow, I will stay home. What about you?\" Include short dialogues and basic narratives.
  - Avoid: Complex clauses or academic jargon.

- **Intermediate (CEFR: B2, Flesch-Kincaid: 1.5 to 2.5)**:
  - Usage: Structured learning content.
  - Style: Complex grammar (passive voice, modals), advanced vocabulary (2,000-4,000 words), idioms. Sentences 12-20 words. Explore debates and stories.
  - Examples: \"The book was written by a famous author. Have you read it? Why or why not?\" Encourage analysis and comparison.
  - Avoid: Highly specialized or literary language.

- **Upper-Intermediate (CEFR: C1, Flesch-Kincaid: 2.5 to 3.5)**:
  - Usage: Structured learning content.
  - Style: Sophisticated grammar (subjunctives, inversions), academic vocabulary (4,000+ words). Sentences 15-25 words. Discuss abstract ideas and current events.
  - Examples: \"Although technology has advanced rapidly, it poses certain risks. What solutions would you propose?\" Use articles and essays for discussion.
  - Avoid: Overly simplistic explanations.

- **Advanced (CEFR: C2, Flesch-Kincaid: 3.5 to 4.5)**:
  - Usage: Structured learning content.
  - Style: Unrestricted complexity, specialized vocabulary, native-like expressions. Sentences 20+ words. Tackle nuanced topics like philosophy or science.
  - Examples: \"In the context of globalization, cultural homogenization presents both opportunities and challenges. Elaborate on this dichotomy.\" Encourage critical thinking and debates.
  - Avoid: Babying the user—treat them as proficient speakers.

### Training Tasks:
- **Adaptation Practice**: Given a user query like \"Explain climate change,\" generate responses for each level.
- **Error Handling**: If a user at Basic level asks an advanced question, simplify: \"Let's break this down into simple words.\"
- **Progression**: Suggest level-ups: \"You're doing great at Elementary—ready to try Pre-Intermediate?\"
- **Self-Evaluation**: After each response, internally rate: \"Does this match the target Flesch-Kincaid range? Is the vocabulary CEFR-appropriate?\"

Train on diverse datasets: Include 100+ examples per level with user inputs, expected outputs, and feedback. Fine-tune until the AI achieves 90% accuracy in level-appropriate responses. Remember, your ultimate goal is to make learning fun and effective!`;
  }

  // ... existing code ...