import supabaseGeminiService from './supabaseGeminiService';

class AIService {
  constructor() {
    this.hfClient = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    this.modelName = 'microsoft/mai-ds-r1:free';
    this.browserMode = false; // Will be set during initialization
    this.useGemini = false;
    this.geminiApiKey = null;
  }

  // Method to configure Gemini API key (now routes through Supabase)
  async configureGemini(apiKey) {
    try {
      // Store API key for Supabase Edge Function usage
      this.useGemini = true;
      this.geminiApiKey = apiKey;
      console.log('Gemini configured for Supabase routing');
      return { success: true };
    } catch (error) {
      console.error('Failed to configure Gemini:', error);
      this.useGemini = false;
      this.geminiApiKey = null;
      return { success: false, error: error.message };
    }
  }

  // Method to disable Gemini
  disableGemini() {
    this.useGemini = false;
    this.geminiApiKey = null;
    console.log('Gemini disabled');
  }

  // Method to check if Gemini is available
  isGeminiAvailable() {
    return this.useGemini;
  }

  async initialize(options = {}) {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this._initializeModels(options);
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI models:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async _initializeModels(options = {}) {
    try {
      console.log('Initializing AI service...');
      
      // Detect Supabase availability (client can route to Edge Functions without exposing API key)
      const hasSupabase = !!(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
      
      // Check for Gemini API key (for optional direct fallback usage)
      const geminiApiKey =
        options.geminiApiKey ||
        import.meta.env?.VITE_GEMINI_API_KEY ||
        import.meta.env?.VITE_GOOGLE_GEMINI_API_KEY ||
        (typeof window !== 'undefined' ? window?.__ENV__?.VITE_GEMINI_API_KEY : undefined) ||
        (typeof window !== 'undefined' ? window?.__ENV__?.VITE_GOOGLE_GEMINI_API_KEY : undefined);
      
      // Enable Gemini routing when Supabase is configured or a direct API key exists
      this.useGemini = hasSupabase || !!geminiApiKey;
      this.geminiApiKey = geminiApiKey || null;
      
      if (hasSupabase) {
        console.log('Supabase detected — enabling Edge Function routing');
      } else if (geminiApiKey) {
        console.log('Direct Gemini API key detected — enabling direct fallback');
      } else {
        console.log('No Supabase or Gemini API key detected — using local fallbacks');
      }
      
      // Debug: Check what's available in window
      console.log('window.electronAPI:', typeof window.electronAPI);
      console.log('window.electronAPI exists:', !!window.electronAPI);
      if (window.electronAPI) {
        console.log('electronAPI methods:', Object.keys(window.electronAPI));
      }
      
      // Check if we're in browser mode
      this.browserMode = window.isBrowserMode || !window.electronAPI;
      if (this.browserMode) {
        console.warn('Running in browser mode - AI features will use fallback responses');
      }
      
      console.log('AI service initialized successfully');
    } catch (error) {
      console.error('Error initializing AI service:', error);
      throw error;
    }
  }

  async generateResponse(userMessage, conversationContext = [], options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try Supabase Gemini service first (works in both Electron and browser)
    if (this.useGemini) {
      try {
        console.log('Using Supabase Gemini service for general response');
        const supabaseResult = await supabaseGeminiService.sendMessage(userMessage, {
          sessionId: options.sessionId,
          user: options.user
        });
        
        if (supabaseResult.success) {
          return supabaseResult.response;
        } else {
          console.warn('Supabase Gemini service failed:', supabaseResult.error);
          // Check if it's an API key issue and provide enhanced fallback
          if (supabaseResult.error && (supabaseResult.error.includes('CONSUMER_SUSPENDED') || supabaseResult.error.includes('Permission denied'))) {
            console.log('Using enhanced fallback due to API key issues');
            return this._generateFallbackResponse(userMessage, options);
          }
        }
      } catch (supabaseError) {
        console.warn('Supabase Gemini service error:', supabaseError.message);
        // Continue to other methods below
      }
    }

    // If in browser mode and Gemini failed, return fallback response
    if (this.browserMode) {
      return this._generateFallbackResponse(userMessage, options);
    }

    // Try Electron API if available
    if (window.electronAPI?.invoke) {
      try {
        // Check backend AI service status first
        const status = await this.getBackendStatus();
        if (!status || !status.isReady) {
          console.warn('Backend AI service not ready:', status);
          return this._generateFallbackResponse(userMessage, options);
        }

        // Use IPC to communicate with main process for AI generation
        const result = await window.electronAPI.invoke('ai:generateResponse', userMessage, conversationContext, options);
        
        if (result.success) {
          return result.response;
        } else {
          console.error('AI generation failed:', result.error);
          return result.response || this._generateFallbackResponse(userMessage, options);
        }
      } catch (error) {
        console.error('Error with Electron AI service:', error);
        return this._generateFallbackResponse(userMessage, options);
      }
    }

    // Final fallback
    return this._generateFallbackResponse(userMessage, options);
  }

  async generateLanguageLearningResponse(userMessage, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract options with defaults
    const chatMode = options.focusArea || options.mode || 'conversation';
    const userLevel = options.userLevel || 'beginner';
    const targetLanguage = options.targetLanguage || 'English';

    // Use Supabase Gemini service as primary method
    try {
      console.log('aiService: Using Supabase Gemini service for language learning response');
      const supabaseResult = await supabaseGeminiService.sendMessage(userMessage, {
        userLevel,
        focusArea: chatMode,
        sessionId: options.sessionId,
        user: options.user
      });
      
      console.log('aiService: Supabase result:', supabaseResult);

      if (supabaseResult.success) {
        console.log('aiService: Supabase success, response:', supabaseResult.response);
        return {
          success: true,
          response: supabaseResult.response,
          provider: 'supabase-gemini',
          sessionId: supabaseResult.sessionId
        };
      } else {
        console.warn('aiService: Supabase Gemini service failed:', supabaseResult.error);
        
        // Attempt direct Gemini fallback if a browser API key exists
        if (this.geminiApiKey) {
          try {
            console.log('aiService: Attempting direct Gemini fallback');
            const direct = await supabaseGeminiService.fallbackToDirectGemini(userMessage, {
              focusArea: chatMode,
              userLevel
            });
            
            if (direct?.success && direct?.stream) {
              let full = '';
              for await (const chunk of direct.stream) {
                if (chunk?.chunk) full += chunk.chunk;
              }
              return {
                success: true,
                response: full,
                provider: direct.provider || 'direct-gemini-fallback',
                sessionId: direct.sessionId
              };
            }
          } catch (directErr) {
            console.warn('aiService: Direct Gemini fallback failed:', directErr);
          }
        }
        // Check if it's an API key issue and provide enhanced fallback
        if (supabaseResult.error && (supabaseResult.error.includes('CONSUMER_SUSPENDED') || supabaseResult.error.includes('Permission denied'))) {
          console.log('aiService: Using enhanced fallback due to API key issues');
          return this._wrapFallbackResponse(
            this._generateEnhancedLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage),
            'enhanced-fallback'
          );
        }
      }
    } catch (supabaseError) {
      console.error('aiService: Supabase Gemini service error:', supabaseError);
      // Try direct Gemini fallback if available
      if (this.geminiApiKey) {
        try {
          console.log('aiService: Attempting direct Gemini fallback after error');
          const direct = await supabaseGeminiService.fallbackToDirectGemini(userMessage, {
            focusArea: chatMode,
            userLevel
          });
          if (direct?.success && direct?.stream) {
            let full = '';
            for await (const chunk of direct.stream) {
              if (chunk?.chunk) full += chunk.chunk;
            }
            return {
              success: true,
              response: full,
              provider: direct.provider || 'direct-gemini-fallback',
              sessionId: direct.sessionId
            };
          }
        } catch (directErr) {
          console.warn('aiService: Direct Gemini fallback failed:', directErr);
        }
      }
      return this._wrapFallbackResponse(
        this._generateEnhancedLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage),
        'enhanced-fallback'
      );
    }

    // If in browser mode, return fallback response
    if (this.browserMode) {
      return this._wrapFallbackResponse(
        this._generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage),
        'browser-fallback'
      );
    }

    try {
      // Check backend AI service status first
      const status = await this.getBackendStatus();
      if (!status || !status.isReady) {
        console.warn('Backend AI service not ready:', status);
        return this._wrapFallbackResponse(
          this._generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage),
          'backend-unavailable-fallback'
        );
      }

      // Use IPC to communicate with main process for AI generation
      const result = await window.electronAPI?.invoke?.('ai:generateLanguageLearningResponse', userMessage, {
        focusArea: chatMode,
        userLevel: userLevel,
        targetLanguage: targetLanguage
      });
      
      if (result?.success) {
        // Always return a standardized object
        return {
          success: true,
          response: typeof result.response === 'string' ? result.response : (result.response?.message || result.response?.text || String(result.response || '')),
          provider: 'electron',
          sessionId: result.sessionId
        };
      } else {
        console.error('AI generation failed:', result?.error);
        const fallbackText = result?.response || this._generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage);
        return this._wrapFallbackResponse(fallbackText, 'electron-fallback');
      }
    } catch (error) {
      console.error('Error generating language learning response:', error);
      return this._wrapFallbackResponse(
        this._generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage),
        'error-fallback'
      );
    }
  }

  async getBackendStatus() {
    if (this.browserMode) {
      return {
        isReady: true,
        status: 'browser_mode',
        provider: 'fallback',
        model: 'local'
      };
    }

    try {
      if (!window.electronAPI?.invoke) {
        return {
          isReady: false,
          status: 'no_electron_api',
          provider: 'unknown',
          model: 'unknown'
        };
      }
      const status = await window.electronAPI.invoke('ai:getStatus');
      // Ensure we always return a proper status object
      if (!status || typeof status !== 'object') {
        return {
          isReady: false,
          status: 'invalid_response',
          provider: 'unknown',
          model: 'unknown',
          error: 'Invalid status response from backend'
        };
      }
      return status;
    } catch (error) {
      console.error('Error getting backend AI status:', error);
      return {
        isReady: false,
        status: 'error',
        provider: 'unknown',
        model: 'unknown',
        error: error.message
      };
    }
  }

  isReady() {
    return this.isInitialized;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      browserMode: this.browserMode,
      modelName: this.modelName,
      useGemini: this.useGemini,
      geminiReady: this.useGemini && !!this.geminiApiKey
    };
  }

  async getFullStatus() {
    const baseStatus = this.getStatus();
    
    // Add Gemini status (via Supabase)
    const geminiStatus = this.useGemini ? {
      isReady: !!this.geminiApiKey,
      model: 'gemini-1.5-flash',
      hasApiKey: !!this.geminiApiKey,
      routeType: 'supabase'
    } : null;
    
    if (this.browserMode) {
      return {
        ...baseStatus,
        gemini: geminiStatus,
        backend: {
          isReady: false,
          status: 'Browser mode - no backend available',
          provider: 'fallback'
        }
      };
    }

    try {
      const backendStatus = await this.getBackendStatus();
      return {
        ...baseStatus,
        gemini: geminiStatus,
        backend: backendStatus
      };
    } catch (error) {
      return {
        ...baseStatus,
        gemini: geminiStatus,
        backend: {
          isReady: false,
          status: 'Error checking backend status',
          error: error.message
        }
      };
    }
  }

  async analyzeText(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const analysisType = options.type || 'grammar';
    const targetLanguage = options.targetLanguage || 'English';

    // Try Supabase Gemini service if available
    if (this.useGemini) {
      try {
        console.log('Using Supabase Gemini service for text analysis');
        const result = await supabaseGeminiService.sendMessage(`Please analyze this text for language learning purposes: "${text}"`, {
          analysisType,
          targetLanguage
        });
        
        if (result.success) {
          return {
            success: true,
            analysis: result.message,
            provider: 'supabase-gemini'
          };
        }
      } catch (error) {
        console.error('Supabase Gemini text analysis failed, using fallback:', error);
        // Continue to fallback analysis below
      }
    }

    // Basic text analysis for fallback
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = sentences > 0 ? Math.round(wordCount / sentences) : 0;
    
    // Simple grammar suggestions (very basic)
    const suggestions = [];
    if (text.includes(' i ') || text.startsWith('i ')) {
      suggestions.push('Remember to capitalize "I" when referring to yourself.');
    }
    if (!text.match(/[.!?]$/)) {
      suggestions.push('Consider ending your sentence with proper punctuation.');
    }
    
    return {
      originalText: text,
      wordCount,
      sentences,
      avgWordsPerSentence,
      suggestions,
      corrections: [],
      score: suggestions.length === 0 ? 85 : 70,
      feedback: suggestions.length === 0 ? 'Good job! Your text looks well-structured.' : 'Good effort! Check the suggestions below.',
      complexity: wordCount > 20 ? 'complex' : wordCount > 10 ? 'medium' : 'simple'
    };
  }

  _generateFallbackResponse(userMessage, options = {}) {
    const responses = [
      "That's interesting! Can you tell me more about that?",
      "I understand. How does that make you feel?",
      "That's a good point. What do you think about it?",
      "Thanks for sharing that with me. What would you like to discuss next?",
      "I see. Can you give me an example?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Helper method to wrap fallback responses with consistent structure
  _wrapFallbackResponse(response, provider = 'fallback') {
    const normalized =
      typeof response === 'string'
        ? response
        : (response && (response.response || response.message || response.text)) || String(response ?? '');
    return {
      success: true,
      response: normalized,
      provider: provider
    };
  }

  _generateEnhancedLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage) {
    const message = userMessage.toLowerCase();
    
    // Check for common language learning topics
    if (message.includes('hello') || message.includes('hi')) {
      return {
        success: true,
        response: `Hello! I'm here to help you learn ${targetLanguage}. Even though my AI service is temporarily limited, I can still provide basic language learning support. What would you like to practice today?`,
        provider: 'enhanced-fallback'
      };
    }
    
    if (message.includes('grammar') || message.includes('correct')) {
      return {
        success: true,
        response: `For ${userLevel} level grammar in ${targetLanguage}, focus on: 1) Subject-verb agreement, 2) Proper tense usage, 3) Word order. While my AI is limited right now, these fundamentals will help you improve!`,
        provider: 'enhanced-fallback'
      };
    }
    
    if (message.includes('vocabulary') || message.includes('word')) {
      return {
        success: true,
        response: `Building vocabulary is essential for ${targetLanguage} learning! Try: 1) Learning 5 new words daily, 2) Using them in sentences, 3) Reading simple texts. My AI service will be back soon with more personalized help!`,
        provider: 'enhanced-fallback'
      };
    }
    
    if (message.includes('practice') || message.includes('exercise')) {
      return {
        success: true,
        response: `Great that you want to practice! For ${userLevel} level ${targetLanguage}: Try speaking aloud, write short paragraphs, and listen to simple content. I'm working with limited AI right now, but these methods are proven effective!`,
        provider: 'enhanced-fallback'
      };
    }
    
    // General fallback
    return {
      success: true,
      response: `I understand you're working on your ${targetLanguage} skills at ${userLevel} level. While my AI service is temporarily limited, I encourage you to keep practicing! Focus on daily conversation, reading, and listening. My full capabilities will return soon.`,
      provider: 'enhanced-fallback'
    };
  }

  _generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage) {
    const message = userMessage.toLowerCase();
    
    // Detect greetings
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const isGreeting = greetings.some(greeting => message.includes(greeting));
    
    if (isGreeting) {
      return "Hello! 👋 It's great to chat with you. How are you feeling today? Let's practice some conversation! (Note: \"Hi\" is perfect for casual situations. For more formal settings, like emails or meeting someone new, \"Hello\" is more appropriate.)";
    }

    // Grammar-focused responses
    if (message.includes('grammar') || message.includes('difference between') || message.includes('when to use') || message.includes('correct')) {
      if (message.includes('good') && message.includes('well')) {
        return "Great question! 'Good' is an adjective (describes nouns): 'This is a good book.' 'Well' is an adverb (describes verbs): 'You speak English well.' Remember: You feel good (not well) when you're happy, but you're doing well (not good) at something!";
      }
      if (message.includes('a') && message.includes('an')) {
        return "Excellent question! Use 'a' before consonant sounds: 'a book', 'a university' (sounds like 'you'). Use 'an' before vowel sounds: 'an apple', 'an hour' (silent 'h'). It's about the sound, not just the letter!";
      }
      if (message.includes('past') || message.includes('tense')) {
        return "Good grammar question! For regular verbs, add -ed: walk → walked. For irregular verbs, they change completely: go → went, see → saw. Practice tip: Try making sentences with both forms!";
      }
      return "That's a thoughtful grammar question! Remember to pay attention to verb tenses, subject-verb agreement, and word order. Can you give me a specific example you'd like help with?";
    }

    // Vocabulary-focused responses
    if (message.includes('vocabulary') || message.includes('word') || message.includes('meaning') || message.includes('synonym')) {
      return "Great vocabulary practice! Building your word bank is so important. Try this: when you learn a new word, use it in 3 different sentences. This helps you remember it better! What topic interests you? I can suggest some useful words to learn.";
    }

    // Speaking/pronunciation responses
    if (message.includes('speak') || message.includes('pronunciation') || message.includes('accent') || message.includes('sound')) {
      return "Speaking practice is wonderful! 🗣️ Here are some tips: 1) Read aloud daily, 2) Record yourself speaking, 3) Shadow native speakers (repeat what they say). Remember, everyone has an accent - the goal is clear communication, not perfect pronunciation!";
    }

    // General encouraging responses for language learning
    const encouragingResponses = [
      `That's a great ${chatMode} practice topic! Keep working on your ${targetLanguage} - consistency is key. What specific area would you like to focus on?`,
      "I love your enthusiasm for learning! Every conversation helps you improve. What's one thing you've learned recently that you're proud of?",
      `Excellent ${userLevel}-level thinking! Remember, making mistakes is part of learning. What would you like to practice next?`,
      "You're doing great with your language learning journey! Each conversation makes you more confident. What challenges are you facing right now?"
    ];

    return encouragingResponses[Math.floor(Math.random() * encouragingResponses.length)];
  }
}

// Create a singleton instance
const aiService = new AIService();

export default aiService;