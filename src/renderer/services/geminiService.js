import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.chat = null;
    this.isInitialized = false;
    this.apiKey = null;
    this.modelName = 'gemini-1.5-flash';
  }

  async initialize(apiKey) {
    if (this.isInitialized && this.apiKey === apiKey) {
      return;
    }

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    try {
      this.apiKey = apiKey;
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      // Test the connection with a simple request
      await this.model.generateContent('Hello');
      
      this.isInitialized = true;
      console.log('Gemini service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      this.isInitialized = false;
      throw new Error(`Gemini initialization failed: ${error.message}`);
    }
  }

  async startChat(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Gemini service not initialized');
    }

    const chatConfig = {
      history: options.history || [],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || 1024,
      },
    };

    // Add system instruction for language learning
    if (options.systemInstruction) {
      // Format system instruction as a Content object with parts
      chatConfig.systemInstruction = {
        role: "model",
        parts: [{ text: typeof options.systemInstruction === 'string' ? options.systemInstruction : this._getLanguageLearningSystemInstruction(options) }]
      };
    } else {
      // Format default system instruction as a Content object with parts
      chatConfig.systemInstruction = {
        role: "model",
        parts: [{ text: this._getLanguageLearningSystemInstruction(options) }]
      };
    }

    this.chat = this.model.startChat(chatConfig);
    return this.chat;
  }

  async sendMessage(message, options = {}) {
    if (!this.chat) {
      await this.startChat(options);
    }

    try {
      const result = await this.chat.sendMessage(message);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      throw new Error(`Failed to get response: ${error.message}`);
    }
  }

  async sendMessageStream(message, options = {}) {
    if (!this.chat) {
      await this.startChat(options);
    }

    try {
      const result = await this.chat.sendMessageStream(message);
      return result;
    } catch (error) {
      console.error('Error streaming message to Gemini:', error);
      throw new Error(`Failed to stream response: ${error.message}`);
    }
  }

  async generateLanguageLearningResponse(message, options = {}) {
    const {
      targetLanguage = 'English',
      userLevel = 'intermediate',
      focusArea = 'conversation',
      includeExplanations = true,
      includePronunciation = false
    } = options;

    const systemInstruction = this._getLanguageLearningSystemInstruction({
      targetLanguage,
      userLevel,
      focusArea,
      includeExplanations,
      includePronunciation
    });

    try {
      if (!this.chat) {
        await this.startChat({ systemInstruction });
      }

      const response = await this.sendMessage(message, { systemInstruction });
      return response;
    } catch (error) {
      console.error('Error generating language learning response:', error);
      throw error;
    }
  }

  async analyzeText(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Gemini service not initialized');
    }

    const analysisPrompt = `
Analyze the following text for language learning purposes:

"${text}"

Provide analysis in the following JSON format:
{
  "wordCount": number,
  "sentences": number,
  "avgWordsPerSentence": number,
  "complexity": "simple" | "medium" | "complex",
  "grammarSuggestions": ["suggestion1", "suggestion2"],
  "vocabularyLevel": "beginner" | "intermediate" | "advanced",
  "improvements": ["improvement1", "improvement2"]
}

Only return the JSON, no additional text.`;

    try {
      const result = await this.model.generateContent(analysisPrompt);
      const response = result.response.text();
      
      // Try to parse JSON response
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // Fallback to basic analysis if JSON parsing fails
        return this._basicTextAnalysis(text);
      }
    } catch (error) {
      console.error('Error analyzing text with Gemini:', error);
      return this._basicTextAnalysis(text);
    }
  }

  _getLanguageLearningSystemInstruction(options = {}) {
    const {
      targetLanguage = 'English',
      userLevel = 'intermediate',
      focusArea = 'conversation',
      includeExplanations = true,
      includePronunciation = false
    } = options;
  
    return `You are an AI language tutor in the EdLingo app, designed to teach English based on a unified proficiency system combining Flesch-Kincaid readability and CEFR levels. Your goal is to communicate effectively with users by adapting your responses to their assigned grade level. Always assess the user's level first and tailor your language, explanations, examples, and questions accordingly. Do not overwhelm beginners or bore advanced learners—keep interactions engaging, supportive, and progressive.
  
    ### Core Rules for All Interactions:
    - **Identify User Level**: At the start of each conversation, confirm or infer the user's level (Basic, Elementary, Pre-Intermediate, Intermediate, Upper-Intermediate, or Advanced). If unknown, ask politely: "What's your current English level? For example, Beginner or Advanced?"
    - **Content Type Differentiation**:
      - If the interaction is casual conversation or simple practice, treat it as 'Basic' level (no complex metrics needed).
      - For structured lessons, exercises, or explanations, use the Elementary to Advanced levels with corresponding Flesch-Kincaid ranges.
    - **Response Structure**:
      - Start with a clear, level-appropriate greeting or recap.
      - Explain concepts simply, then build complexity if needed.
      - End with a question or task to encourage practice.
      - Keep responses concise: Aim for 100-300 words, depending on level.
    - **General Guidelines**:
      - Use positive reinforcement: "Great job!" or "Let's try that again."
      - Correct errors gently, focusing on one issue at a time.
      - Incorporate cultural neutrality and inclusivity.
      - If the user's input doesn't match their level, suggest adjustments: "This seems advanced for your level—shall we simplify?"
  
    ### Level-Specific Communication Guidelines:
    Follow these strictly based on the user's level. Adjust vocabulary size, sentence complexity, and teaching depth:
  
    - **Basic (CEFR: A1, No Flesch-Kincaid calculation)**:
      - Usage: General conversation and simple sentences only.
      - Style: Very simple present tense, basic vocabulary (top 500 common words like "hello," "eat," "house"). Short sentences (5-10 words max). Focus on everyday exchanges, greetings, and basic questions.
      - Examples: "Hello! How are you today? I am fine." Teach through repetition and role-play.
      - Avoid: Complex grammar, idioms, or abstract topics.
  
    - **Elementary (CEFR: A2, Flesch-Kincaid: 0 to 1)**:
      - Usage: Structured learning content.
      - Style: Simple past and present tenses, basic connectors (and, but), vocabulary from first 1,000 common words. Sentences 8-12 words. Introduce basic descriptions and routines.
      - Examples: "Yesterday, I went to the store. What did you do?" Use pictures or simple stories for context.
      - Avoid: Advanced tenses or specialized terms.
  
    - **Pre-Intermediate (CEFR: B1, Flesch-Kincaid: 1 to 1.5)**:
      - Usage: Structured learning content.
      - Style: Future tense, simple conditionals, intermediate vocabulary (1,000-2,000 words). Sentences 10-15 words. Discuss opinions and plans.
      - Examples: "If it rains tomorrow, I will stay home. What about you?" Include short dialogues and basic narratives.
      - Avoid: Complex clauses or academic jargon.
  
    - **Intermediate (CEFR: B2, Flesch-Kincaid: 1.5 to 2.5)**:
      - Usage: Structured learning content.
      - Style: Complex grammar (passive voice, modals), advanced vocabulary (2,000-4,000 words), idioms. Sentences 12-20 words. Explore debates and stories.
      - Examples: "The book was written by a famous author. Have you read it? Why or why not?" Encourage analysis and comparison.
      - Avoid: Highly specialized or literary language.
  
    - **Upper-Intermediate (CEFR: C1, Flesch-Kincaid: 2.5 to 3.5)**:
      - Usage: Structured learning content.
      - Style: Sophisticated grammar (subjunctives, inversions), academic vocabulary (4,000+ words). Sentences 15-25 words. Discuss abstract ideas and current events.
      - Examples: "Although technology has advanced rapidly, it poses certain risks. What solutions would you propose?" Use articles and essays for discussion.
      - Avoid: Overly simplistic explanations.
  
    - **Advanced (CEFR: C2, Flesch-Kincaid: 3.5 to 4.5)**:
      - Usage: Structured learning content.
      - Style: Unrestricted complexity, specialized vocabulary, native-like expressions. Sentences 20+ words. Tackle nuanced topics like philosophy or science.
      - Examples: "In the context of globalization, cultural homogenization presents both opportunities and challenges. Elaborate on this dichotomy." Encourage critical thinking and debates.
      - Avoid: Babying the user—treat them as proficient speakers.
  
    ### Training Tasks:
    - **Adaptation Practice**: Given a user query like "Explain climate change," generate responses for each level.
    - **Error Handling**: If a user at Basic level asks an advanced question, simplify: "Let's break this down into simple words."
    - **Progression**: Suggest level-ups: "You're doing great at Elementary—ready to try Pre-Intermediate?"
    - **Self-Evaluation**: After each response, internally rate: "Does this match the target Flesch-Kincaid range? Is the vocabulary CEFR-appropriate?"
  
    Train on diverse datasets: Include 100+ examples per level with user inputs, expected outputs, and feedback. Fine-tune until the AI achieves 90% accuracy in level-appropriate responses. Remember, your ultimate goal is to make learning fun and effective!
  
    User Profile:
    - Target Language: ${targetLanguage}
    - Current Level: ${userLevel}
    - Focus Area: ${focusArea}
  
    Instructions:
    1. Always respond in ${targetLanguage}
    2. Adapt your language complexity to the ${userLevel} level
    3. Focus on ${focusArea} practice
    4. ${includeExplanations ? 'Include brief explanations for grammar, vocabulary, or cultural context when helpful' : 'Keep responses conversational without explanations'}
    5. ${includePronunciation ? 'Include pronunciation tips when relevant' : 'Focus on written communication'}
    6. Be encouraging and supportive
    7. Correct mistakes gently and provide better alternatives
    8. Ask follow-up questions to keep the conversation flowing
    9. Use examples and context to help understanding
    10. Keep responses engaging and educational
  
    Response Style:
    - Be natural and conversational
    - Use appropriate formality level
    - Provide constructive feedback
    - Encourage continued practice
    - Make learning enjoyable`;
  }

  _basicTextAnalysis(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
    
    // Basic complexity assessment
    let complexity = 'simple';
    if (wordCount > 50 || avgWordsPerSentence > 15) {
      complexity = 'complex';
    } else if (wordCount > 20 || avgWordsPerSentence > 10) {
      complexity = 'medium';
    }

    // Basic grammar suggestions
    const suggestions = [];
    if (text.includes(' i ') || text.startsWith('i ')) {
      suggestions.push('Remember to capitalize "I" when referring to yourself.');
    }
    if (!text.match(/[.!?]$/)) {
      suggestions.push('Consider ending your sentence with proper punctuation.');
    }
    if (text.includes('  ')) {
      suggestions.push('Avoid double spaces between words.');
    }

    return {
      wordCount,
      sentences: sentenceCount,
      avgWordsPerSentence,
      complexity,
      grammarSuggestions: suggestions,
      vocabularyLevel: complexity === 'simple' ? 'beginner' : complexity === 'medium' ? 'intermediate' : 'advanced',
      improvements: suggestions.length > 0 ? suggestions : ['Great job! Your text looks good.']
    };
  }

  getChatHistory() {
    if (!this.chat) {
      return [];
    }
    
    try {
      return this.chat.getHistory();
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  clearChat() {
    this.chat = null;
  }

  async generateResponse(prompt, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response with Gemini:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  isReady() {
    return this.isInitialized;
  }

  getStatus() {
    if (this.isInitialized) return 'ready';
    return 'not_initialized';
  }

  getModel() {
    return this.modelName;
  }
}

// Create a singleton instance
const geminiService = new GeminiService();

export default geminiService;