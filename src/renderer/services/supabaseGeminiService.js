import { createClient } from '@supabase/supabase-js';

class SupabaseGeminiService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.currentSessionId = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing. Please check your environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.isInitialized = true;
    console.log('Supabase Gemini service initialized successfully');
  }

  async sendMessage(message, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let currentSessionId = options.sessionId || this.currentSessionId;
      if (!currentSessionId) {
        // Auto-create a session if none exists
        currentSessionId = crypto.randomUUID();
        this.currentSessionId = currentSessionId;
        console.log('Auto-created new session:', currentSessionId);
      }
  
      // Get current user from options or fallback to existing user ID
      let user = options.user;
      if (!user) {
        const { data: { user: authUser }, error: userError } = await this.supabase.auth.getUser();
        if (userError || !authUser) {
          // Fallback to a known valid user ID for development
          user = { id: '8584505a-79b2-4b39-a368-03045f8a4f6a' };
        } else {
          user = authUser;
        }
      }
  
      // Prepare request data
      const requestData = {
        message,
        user_id: user.id,
        session_id: currentSessionId,
        user_level: options.userLevel || 'beginner',
        focus_area: options.focusArea || 'conversation'
      };
  
      // Call the Edge Function
      const { data, error } = await this.supabase.functions.invoke('process-gemini-chat', {
        body: requestData
      });
  
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to process message: ${error.message}`);
      }

      // Check if there's an error in the response
      if (data.error) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // The Edge Function returns { response: aiMessage }
      if (!data.response) {
        throw new Error('No response received from AI');
      }

      // Keep the current session ID since we're using it
      // this.currentSessionId remains the same

      return {
        success: true,
        message: data.response,
        sessionId: currentSessionId,
        provider: 'supabase-gemini'
      };
  
    } catch (error) {
      console.error('Supabase Gemini service error:', error);
      
      // Check if it's a Gemini API key suspension error
      if (error.message && error.message.includes('CONSUMER_SUSPENDED')) {
        console.warn('Gemini API key has been suspended, using fallback response');
        return {
          success: false,
          error: 'API_KEY_SUSPENDED',
          message: 'I\'m currently experiencing technical difficulties with my AI service. I\'ll provide a basic response to help you continue learning.'
        };
      }
      
      // Check for permission denied errors
      if (error.message && (error.message.includes('Permission denied') || error.message.includes('403'))) {
        console.warn('Gemini API permission denied, using fallback response');
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'I\'m having trouble accessing my AI capabilities right now. Let me provide a helpful response based on common language learning patterns.'
        };
      }
      
      return {
        success: false,
        error: error.message,
        message: 'I apologize, but I\'m having trouble processing your message right now. Please try again.'
      };
    }
  }

  async getConversationHistory(sessionId = null, limit = 50, user = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get current user from parameter or fallback to existing user ID
      if (!user) {
        const { data: { user: authUser }, error: userError } = await this.supabase.auth.getUser();
        if (userError || !authUser) {
          // Fallback to a known valid user ID for development
          user = { id: '8584505a-79b2-4b39-a368-03045f8a4f6a' };
        } else {
          user = authUser;
        }
      }

      let query = this.supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else if (this.currentSessionId) {
        query = query.eq('session_id', this.currentSessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return [];
    }
  }

  async startNewSession() {
    this.currentSessionId = crypto.randomUUID();
    return this.currentSessionId;
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }

  async deleteMessage(messageId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { error } = await this.supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteMessage:', error);
      return { success: false, error: error.message };
    }
  }

  async clearSession(sessionId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const targetSessionId = sessionId || this.currentSessionId;
      if (!targetSessionId) {
        return { success: true }; // Nothing to clear
      }

      const { error } = await this.supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', targetSessionId);

      if (error) {
        console.error('Error clearing session:', error);
        return { success: false, error: error.message };
      }

      if (sessionId === this.currentSessionId || !sessionId) {
        this.currentSessionId = null;
      }

      return { success: true };
    } catch (error) {
      console.error('Error in clearSession:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSessions(limit = 10, user = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get current user from parameter or fallback to existing user ID
      if (!user) {
        const { data: { user: authUser }, error: userError } = await this.supabase.auth.getUser();
        if (userError || !authUser) {
          // Fallback to a known valid user ID for development
          user = { id: '8584505a-79b2-4b39-a368-03045f8a4f6a' };
        } else {
          user = authUser;
        }
      }

      const { data, error } = await this.supabase
        .from('chat_messages')
        .select('session_id, created_at, content')
        .eq('user_id', user.id)
        .eq('message_type', 'user')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user sessions:', error);
        return [];
      }

      // Group by session_id and get the first message of each session
      const sessions = {};
      data?.forEach(message => {
        if (!sessions[message.session_id]) {
          sessions[message.session_id] = {
            sessionId: message.session_id,
            firstMessage: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
            createdAt: message.created_at
          };
        }
      });

      return Object.values(sessions).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  }

  isReady() {
    return this.isInitialized && this.supabase;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      hasSupabase: !!this.supabase,
      currentSessionId: this.currentSessionId
    };
  }

  /**
   * Generate vocabulary introduction
   * @param {Array<string>} vocabList - List of vocabulary words
   * @param {string} cefrLevel - CEFR level
   * @returns {Promise<Object>} Generated introduction
   */
  async generateVocabIntro(vocabList, cefrLevel) {
    const prompt = `Generate a simple introduction to these vocabulary words: ${vocabList.join(', ')} at CEFR level ${cefrLevel}. Include definitions, examples, and pronunciation tips.`;
    return this.sendMessage(prompt, { focusArea: 'vocabulary' });
  }

  /**
   * Generate a test
   * @param {string} cefrLevel - CEFR level
   * @param {string} topic - Test topic
   * @returns {Promise<Object>} Generated test
   */
  async generateTest(cefrLevel, topic) {
    const prompt = `Create a short test on ${topic} at CEFR level ${cefrLevel}. Include multiple choice questions and answers.`;
    return this.sendMessage(prompt, { focusArea: 'testing' });
  }

  /**
   * Provide writing feedback
   * @param {string} text - User's writing text
   * @param {string} cefrLevel - CEFR level
   * @returns {Promise<Object>} Feedback
   */
  async provideWritingFeedback(text, cefrLevel) {
    const prompt = `Provide feedback on this writing: "${text}" at CEFR level ${cefrLevel}. Suggest improvements in grammar, vocabulary, and structure.`;
    return this.sendMessage(prompt, { focusArea: 'writing' });
  }

  /**
   * Generate conversation practice
   * @param {string} scenario - Conversation scenario
   * @param {string} cefrLevel - CEFR level
   * @returns {Promise<Object>} Conversation starter
   */
  async generateConvoPractice(scenario, cefrLevel) {
    const prompt = `Start a conversation practice in scenario: ${scenario} at CEFR level ${cefrLevel}. Provide the first message as the AI partner.`;
    return this.sendMessage(prompt, { focusArea: 'conversation' });
  }
}

// Create and export singleton instance
const supabaseGeminiService = new SupabaseGeminiService();
export default supabaseGeminiService;
