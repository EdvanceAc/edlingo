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
      
      // Check for Gemini API key (for Supabase routing)
      const geminiApiKey = options.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
      
      if (geminiApiKey) {
        console.log('Gemini API key available for Supabase routing');
        this.useGemini = true;
        this.geminiApiKey = geminiApiKey;
      } else {
        console.log('No Gemini API key provided, using fallback providers');
        this.useGemini = false;
      }
      
      // Debug: Check what's available in window
      console.log('window.electronAPI:', typeof window.electronAPI);
      console.log('window.electronAPI exists:', !!window.electronAPI);
      if (window.electronAPI) {
        console.log('electronAPI methods:', Object.keys(window.electronAPI));
      }
      
      // Check if we're in Electron environment
      if (!window.electronAPI) {
        console.warn('Running in browser mode - AI features will use fallback responses');
        this.browserMode = true;
      } else {
        this.browserMode = false;
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

    // If in browser mode, return fallback response
    if (this.browserMode) {
      return this._generateFallbackResponse(userMessage, options);
    }

    try {
      // Check backend AI service status first
      const status = await this.getBackendStatus();
      if (!status || !status.isReady) {
        console.warn('Backend AI service not ready:', status);
        return 'AI chat is currently unavailable. Please check your API configuration.';
      }

      // Use IPC to communicate with main process for AI generation
      const result = await window.electronAPI.invoke('ai:generateResponse', userMessage, conversationContext, options);
      
      if (result.success) {
        return result.response;
      } else {
        console.error('AI generation failed:', result.error);
        return result.response || 'I\'m sorry, I encountered an error while processing your message. Please try again.';
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I\'m sorry, I encountered an error while processing your message. Please try again.';
    }
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
      console.log('Using Supabase Gemini service for language learning response');
      const supabaseResult = await supabaseGeminiService.sendMessage(userMessage, {
        userLevel,
        focusArea: chatMode,
        sessionId: options.sessionId,
        user: options.user
      });
      
      if (supabaseResult.success) {
        return {
          success: true,
          response: supabaseResult.message,
          provider: 'supabase-gemini',
          sessionId: supabaseResult.sessionId
        };
      }
    } catch (supabaseError) {
      console.warn('Supabase Gemini service failed:', supabaseError.message);
      // Check if it's an API key issue and provide appropriate fallback
      if (supabaseError.message && (supabaseError.message.includes('CONSUMER_SUSPENDED') || supabaseError.message.includes('Permission denied'))) {
        console.log('Using enhanced fallback due to API key issues');
        return this._generateEnhancedLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage);
      }
    }

    // If in browser mode, return fallback response
    if (this.browserMode) {
      return this._generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage);
    }

    try {
      // Check backend AI service status first
      const status = await this.getBackendStatus();
      if (!status || !status.isReady) {
        console.warn('Backend AI service not ready:', status);
        return 'AI chat is currently unavailable. Please check your API configuration.';
      }

      // Use IPC to communicate with main process for AI generation
      const result = await window.electronAPI.invoke('ai:generateLanguageLearningResponse', userMessage, {
        focusArea: chatMode,
        userLevel: userLevel,
        targetLanguage: targetLanguage
      });
      
      if (result.success) {
        return result.response;
      } else {
        console.error('AI generation failed:', result.error);
        return result.response || 'I\'m sorry, I\'m having trouble generating a response right now. Please try again later.';
      }
    } catch (error) {
      console.error('Error generating language learning response:', error);
      return 'I\'m sorry, I\'m having trouble generating a response right now. Please try again later.';
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

  // Assessment-specific methods
  async analyzeConversation(conversationText, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const targetLanguage = options.targetLanguage || 'English';
    
    // Try Supabase Gemini service if available
    if (this.useGemini) {
      try {
        const prompt = `Analyze this conversation for language proficiency assessment:

"${conversationText}"

Provide a detailed analysis including:
1. Fluency score (0-100)
2. Grammar accuracy (0-100)
3. Vocabulary range (0-100)
4. Pronunciation quality (0-100) - estimate based on text patterns
5. Overall CEFR level (A1, A2, B1, B2, C1, C2)
6. Specific strengths and areas for improvement
7. IELTS equivalent score (1-9)

Return as JSON format.`;
        
        const result = await supabaseGeminiService.sendMessage(prompt);
        
        if (result.success) {
          try {
            const analysis = JSON.parse(result.message);
            return {
              success: true,
              analysis: {
                fluency: analysis.fluency || 70,
                grammar: analysis.grammar || 70,
                vocabulary: analysis.vocabulary || 70,
                pronunciation: analysis.pronunciation || 70,
                cefrLevel: analysis.cefrLevel || 'B1',
                ieltsEquivalent: analysis.ieltsEquivalent || 5.5,
                strengths: analysis.strengths || ['Good effort'],
                improvements: analysis.improvements || ['Continue practicing'],
                overallScore: Math.round((analysis.fluency + analysis.grammar + analysis.vocabulary + analysis.pronunciation) / 4)
              }
            };
          } catch (parseError) {
            console.warn('Failed to parse Supabase Gemini response, using fallback analysis');
          }
        }
      } catch (error) {
        console.error('Supabase Gemini conversation analysis failed:', error);
      }
    }

    // Fallback analysis
    return this._analyzeConversationFallback(conversationText);
  }

  async evaluateWriting(writingText, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const targetLanguage = options.targetLanguage || 'English';
    
    // Try Supabase Gemini service if available
    if (this.useGemini) {
      try {
        const prompt = `Evaluate this writing sample for language proficiency assessment:

"${writingText}"

Provide a detailed evaluation including:
1. Grammar accuracy (0-100)
2. Vocabulary sophistication (0-100)
3. Coherence and cohesion (0-100)
4. Task achievement (0-100)
5. Overall CEFR level (A1, A2, B1, B2, C1, C2)
6. Specific feedback and suggestions
7. IELTS writing equivalent score (1-9)

Return as JSON format.`;
        
        const result = await supabaseGeminiService.sendMessage(prompt);
        
        if (result.success) {
          try {
            const evaluation = JSON.parse(result.message);
            return {
              success: true,
              evaluation: {
                grammar: evaluation.grammar || 70,
                vocabulary: evaluation.vocabulary || 70,
                coherence: evaluation.coherence || 70,
                taskAchievement: evaluation.taskAchievement || 70,
                cefrLevel: evaluation.cefrLevel || 'B1',
                ieltsEquivalent: evaluation.ieltsEquivalent || 5.5,
                feedback: evaluation.feedback || 'Good writing effort',
                suggestions: evaluation.suggestions || ['Continue practicing'],
                overallScore: Math.round((evaluation.grammar + evaluation.vocabulary + evaluation.coherence + evaluation.taskAchievement) / 4)
              }
            };
          } catch (parseError) {
            console.warn('Failed to parse Supabase Gemini response, using fallback evaluation');
          }
        }
      } catch (error) {
        console.error('Supabase Gemini writing evaluation failed:', error);
      }
    }

    // Fallback evaluation
    return this._evaluateWritingFallback(writingText);
  }

  async determineCEFRLevel(skillScores, options = {}) {
    const { grammar, vocabulary, fluency, pronunciation, writing } = skillScores;
    const { textContent, isConversational } = options;
    const averageScore = Object.values(skillScores).reduce((sum, score) => sum + score, 0) / Object.values(skillScores).length;
    
    let cefrLevel;
    let ieltsEquivalent;
    
    // Use unified level service for text-based assessments when available
    if (textContent && !isConversational) {
      try {
        const unifiedLevelService = require('./unifiedLevelService');
        const unifiedResult = await unifiedLevelService.assignUnifiedLevel(textContent);
        cefrLevel = unifiedResult.unified_level;
      } catch (error) {
        console.warn('Failed to use unified level service, falling back to traditional mapping:', error);
        cefrLevel = this._mapScoreToCEFR(averageScore);
      }
    } else {
      // Traditional CEFR level mapping based on average score
      cefrLevel = this._mapScoreToCEFR(averageScore);
    }
    
    // Map CEFR to IELTS equivalent
    const cefrToIelts = {
      'C2': 8.5,
      'C1': 7.5,
      'B2': 6.5,
      'B1': 5.5,
      'A2': 4.5,
      'A1': 3.5
    };
    ieltsEquivalent = cefrToIelts[cefrLevel] || 3.5;
    
    return {
      cefrLevel,
      ieltsEquivalent,
      overallScore: Math.round(averageScore),
      skillBreakdown: skillScores,
      recommendations: this._generateRecommendations(cefrLevel, skillScores)
    };
  }

  _mapScoreToCEFR(averageScore) {
    if (averageScore >= 90) {
      return 'C2';
    } else if (averageScore >= 80) {
      return 'C1';
    } else if (averageScore >= 70) {
      return 'B2';
    } else if (averageScore >= 60) {
      return 'B1';
    } else if (averageScore >= 45) {
      return 'A2';
    } else {
      return 'A1';
    }
  }

  _analyzeConversationFallback(conversationText) {
    const wordCount = conversationText.split(/\s+/).filter(word => word.length > 0).length;
    const sentences = conversationText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = sentences > 0 ? Math.round(wordCount / sentences) : 0;
    
    // Basic scoring based on text characteristics
    let fluency = Math.min(90, Math.max(40, wordCount * 2 + avgWordsPerSentence * 5));
    let grammar = conversationText.match(/[A-Z]/) ? 75 : 65; // Basic capitalization check
    let vocabulary = Math.min(85, Math.max(50, wordCount * 1.5));
    let pronunciation = 70; // Default estimate
    
    const overallScore = Math.round((fluency + grammar + vocabulary + pronunciation) / 4);
    
    return {
      success: true,
      analysis: {
        fluency,
        grammar,
        vocabulary,
        pronunciation,
        cefrLevel: overallScore >= 70 ? 'B1' : overallScore >= 55 ? 'A2' : 'A1',
        ieltsEquivalent: overallScore >= 70 ? 5.5 : overallScore >= 55 ? 4.5 : 3.5,
        strengths: ['Participated in conversation'],
        improvements: ['Continue practicing speaking'],
        overallScore
      }
    };
  }

  _evaluateWritingFallback(writingText) {
    const wordCount = writingText.split(/\s+/).filter(word => word.length > 0).length;
    const sentences = writingText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = writingText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    
    // Basic scoring
    let grammar = writingText.match(/[A-Z].*[.!?]/) ? 75 : 65;
    let vocabulary = Math.min(85, Math.max(50, wordCount * 1.2));
    let coherence = paragraphs > 1 ? 75 : 65;
    let taskAchievement = wordCount >= 50 ? 75 : 60;
    
    const overallScore = Math.round((grammar + vocabulary + coherence + taskAchievement) / 4);
    
    return {
      success: true,
      evaluation: {
        grammar,
        vocabulary,
        coherence,
        taskAchievement,
        cefrLevel: overallScore >= 70 ? 'B1' : overallScore >= 55 ? 'A2' : 'A1',
        ieltsEquivalent: overallScore >= 70 ? 5.5 : overallScore >= 55 ? 4.5 : 3.5,
        feedback: 'Good writing effort. Keep practicing!',
        suggestions: ['Focus on sentence structure', 'Expand vocabulary'],
        overallScore
      }
    };
  }

  _generateRecommendations(cefrLevel, skillScores) {
    const recommendations = {
      focusAreas: [],
      suggestedActivities: []
    };
    
    // Find weakest skills
    const sortedSkills = Object.entries(skillScores).sort((a, b) => a[1] - b[1]);
    const weakestSkills = sortedSkills.slice(0, 2).map(([skill]) => skill);
    
    recommendations.focusAreas = weakestSkills;
    
    // Generate activity suggestions based on level and weak areas
    if (weakestSkills.includes('grammar')) {
      recommendations.suggestedActivities.push('Practice grammar exercises daily');
      recommendations.suggestedActivities.push('Focus on verb tenses and sentence structure');
    }
    
    if (weakestSkills.includes('vocabulary')) {
      recommendations.suggestedActivities.push('Learn 10 new words daily');
      recommendations.suggestedActivities.push('Read articles in your target language');
    }
    
    if (weakestSkills.includes('fluency')) {
      recommendations.suggestedActivities.push('Practice speaking with native speakers');
      recommendations.suggestedActivities.push('Record yourself speaking daily');
    }
    
    if (weakestSkills.includes('pronunciation')) {
      recommendations.suggestedActivities.push('Use pronunciation apps and tools');
      recommendations.suggestedActivities.push('Listen to native speakers and repeat');
    }
    
    return recommendations;
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

  // Enhanced fallback for API key issues
  _generateEnhancedLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage) {
    const message = userMessage.toLowerCase();
    
    // Provide more contextual responses based on user input
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
    
    // Default enhanced response
    return {
      success: true,
      response: `I understand you're working on your ${targetLanguage} skills at ${userLevel} level. While my AI service is temporarily limited, I encourage you to keep practicing! Focus on daily conversation, reading, and listening. My full capabilities will return soon.`,
      provider: 'enhanced-fallback'
    };
  }

  _generateLanguageLearningFallback(userMessage, chatMode, userLevel, targetLanguage) {
    const message = userMessage.toLowerCase();
    
    // Handle greetings
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const isGreeting = greetings.some(greeting => message.includes(greeting));
    
    if (isGreeting) {
      return "Hello! 👋 It's great to chat with you. How are you feeling today? Let's practice some conversation! (Note: \"Hi\" is perfect for casual situations. For more formal settings, like emails or meeting someone new, \"Hello\" is more appropriate.)";
    }
    
    // Handle grammar questions
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
    
    // Handle vocabulary questions
    if (message.includes('vocabulary') || message.includes('word') || message.includes('meaning') || message.includes('synonym')) {
      return "Great vocabulary practice! Building your word bank is essential. Try using new words in sentences, learn synonyms, and practice with context. What specific words would you like to explore?";
    }
    
    // Handle pronunciation questions
    if (message.includes('pronunciation') || message.includes('pronounce') || message.includes('sound')) {
      return "Pronunciation is so important! Focus on stress patterns, vowel sounds, and consonant clusters. Practice speaking slowly at first, then build up speed. Record yourself to hear your progress!";
    }
    
    // Default responses based on mode
    const responses = {
      conversation: [
        "That's wonderful! Can you tell me more about that? Try to use descriptive words and express your thoughts clearly.",
        "I find that very interesting. What's your opinion on this topic? Remember to give reasons for your thoughts.",
        "Great point! Can you give me a specific example? This will help you practice storytelling and details.",
        "I understand. How does that make you feel? Practice using emotion words like 'excited', 'concerned', or 'curious'."
      ],
      grammar: [
        "Let me help you with that! Try rephrasing your sentence using different word order or verb forms.",
        "Good attempt! Remember to check your verb tenses - are you talking about past, present, or future?",
        "Nice work! Pay attention to subject-verb agreement. Singular subjects need singular verbs.",
        "Well done! Consider using connecting words like 'because', 'however', 'therefore', or 'although'."
      ],
      vocabulary: [
        "Excellent! Let's expand your vocabulary. Can you think of a synonym (similar word) for that?",
        "Great word choice! Now try using it in a completely different context or situation.",
        "Perfect! Can you create a sentence using that word in past tense? Challenge yourself!",
        "Wonderful! What's the opposite (antonym) of that word? This helps build word relationships."
      ]
    };
    
    const modeResponses = responses[chatMode] || responses.conversation;
    return modeResponses[Math.floor(Math.random() * modeResponses.length)];
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
}

// Create a singleton instance
const aiService = new AIService();

export default aiService;