import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabaseConfig from '../config/supabaseConfig';

class SupabaseGeminiService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.currentSessionId = null;
  }

  async sendStreamingMessage(message, options = {}) {
    console.log('[SupabaseGeminiService] sendStreamingMessage called with:', { message, options });
    try {
      await this.initialize();
      console.log('[SupabaseGeminiService] Service initialized successfully');
      
      let currentSessionId = options.sessionId || this.currentSessionId;
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        this.currentSessionId = currentSessionId;
        console.log('Auto-created new session for streaming:', currentSessionId);
      }

      // Get current user
      let user = options.user;
      if (!user) {
        const { data: { user: authUser }, error: userError } = await this.supabase.auth.getUser();
        if (userError || !authUser) {
          user = { id: '8584505a-79b2-4b39-a368-03045f8a4f6a' };
        } else {
          user = authUser;
        }
      }

      const requestData = {
        message,
        user_id: user.id,
        session_id: currentSessionId,
        user_level: options.userLevel || 'beginner',
        focus_area: options.focusArea || 'conversation',
        streaming: true
      };

      // Build the function URL from environment to avoid client property inconsistencies
      const envSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
      const baseUrl = envSupabaseUrl || supabaseConfig?.url || '';
      const functionUrl = `${baseUrl}/functions/v1/process-gemini-chat?stream=true`;
      console.log('[SupabaseGeminiService] Streaming via', functionUrl);
      
      // Create optimized streaming request with more tolerant timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[SupabaseGeminiService] Streaming fetch aborted due to timeout');
        controller.abort();
      }, 25000); // 25 second timeout for streaming
      
      try {
        // Conditionally include Authorization header only when token exists
        const { data: { session } } = await this.supabase.auth.getSession();
        const headers = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'text/event-stream, text/stream'
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
          const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || supabaseConfig?.anonKey;
          if (anonKey) {
            headers['Authorization'] = `Bearer ${anonKey}`;
          }
        }

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body available for streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        return {
          success: true,
          sessionId: currentSessionId,
          provider: 'supabase-edge-function',
          stream: {
            async *[Symbol.asyncIterator]() {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    // Process any remaining buffer
                    if (buffer.trim()) {
                      const lines = buffer.split('\n');
                      for (const line of lines) {
                        if (line.startsWith('data: ')) {
                          try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content && !data.done) {
                              fullResponse += data.content;
                              yield {
                                chunk: data.content,
                                fullResponse,
                                done: false
                              };
                            }
                            if (data.done) {
                              if (data.fullResponse) {
                                fullResponse = data.fullResponse;
                              }
                              return { fullResponse, done: true };
                            }
                            if (data.error) {
                              throw new Error(data.error);
                            }
                          } catch (e) {
                            console.warn('Failed to parse streaming data:', e);
                          }
                        }
                      }
                    }
                    return { fullResponse, done: true };
                  }

                  // Decode chunk and add to buffer (optimized processing)
                  const chunk = decoder.decode(value, { stream: true });
                  buffer += chunk;
                  
                  // Process complete lines immediately for faster response
                  let newlineIndex;
                  while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 2);
                    
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                          throw new Error(data.error);
                        }
                        
                        if (data.content && !data.done) {
                          fullResponse += data.content;
                          yield {
                            chunk: data.content,
                            fullResponse,
                            done: false
                          };
                        }
                        
                        if (data.done) {
                          if (data.fullResponse) {
                            fullResponse = data.fullResponse;
                          }
                          return { fullResponse, done: true };
                        }
                      } catch (e) {
                        console.warn('Failed to parse streaming data:', e);
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Streaming error:', error);
                throw error;
              } finally {
                reader.releaseLock();
              }
            }
          }
        };

      } catch (error) {
        console.error('Streaming request failed:', error);
        
        // Try fallback to direct Gemini API
        try {
          return this.fallbackToDirectGemini(message, options);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          // Final fallback to non-streaming
          console.log('Falling back to non-streaming request');
          return this.sendMessage(message, { ...options, streaming: false });
        }
      }
    } catch (error) {
      console.error('Streaming request failed:', error);
      
      // Try fallback to direct Gemini API
      try {
        return this.fallbackToDirectGemini(message, options);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Final fallback to non-streaming
        console.log('Falling back to non-streaming request');
        try {
          const nonStreamingResult = await this.sendMessage(message, { ...options, streaming: false });
          console.log('Non-streaming fallback result:', nonStreamingResult);
          return nonStreamingResult;
        } catch (finalError) {
          console.error('All fallbacks failed:', finalError);
          return {
            success: false,
            response: 'I apologize, but I\'m having trouble connecting right now. Please try again later.',
            provider: 'error-fallback'
          };
        }
      }
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    const envUrl = import.meta.env?.VITE_SUPABASE_URL || supabaseConfig?.url;
    const envAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || supabaseConfig?.anonKey;

    if (!envUrl || !envAnonKey) {
      throw new Error('Supabase configuration missing. Please check your environment variables or supabaseConfig.');
    }

    // Prefer preconfigured client if it matches our env values
    if (supabaseConfig?.client && supabaseConfig.url === envUrl && supabaseConfig.anonKey === envAnonKey) {
      this.supabase = supabaseConfig.client;
    } else {
      this.supabase = createClient(envUrl, envAnonKey);
    }

    this.isInitialized = true;
    console.log('Supabase Gemini service initialized successfully');
  }

  async sendMessage(message, options = {}) {
    console.log('[SupabaseGeminiService] sendMessage called with:', { message, options });
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (options.streaming) {
      console.log('[SupabaseGeminiService] Using streaming mode');
      return this.sendStreamingMessage(message, options);
    }
    
    console.log('[SupabaseGeminiService] Using non-streaming mode');

    try {
      let currentSessionId = options.sessionId || this.currentSessionId;
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        this.currentSessionId = currentSessionId;
        console.log('Auto-created new session:', currentSessionId);
      }

      // Get current user
      let user = options.user;
      if (!user) {
        const { data: { user: authUser }, error: userError } = await this.supabase.auth.getUser();
        if (userError || !authUser) {
          user = { id: '8584505a-79b2-4b39-a368-03045f8a4f6a' };
        } else {
          user = authUser;
        }
      }

      const requestData = {
        message,
        user_id: user.id,
        session_id: currentSessionId,
        user_level: options.userLevel || 'beginner',
        focus_area: options.focusArea || 'conversation'
      };

      console.log('[SupabaseGeminiService] Calling Edge Function with:', requestData);

      const { data, error } = await this.supabase.functions.invoke('process-gemini-chat', {
        body: requestData
      });

      console.log('[SupabaseGeminiService] Edge Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('[SupabaseGeminiService] Returning success response with data.response:', data.response);

      return {
        success: true,
        response: data.response,
        sessionId: currentSessionId,
        provider: 'supabase-edge-function'
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  async fallbackToDirectGemini(message, options = {}) {
    // Get Gemini API key from environment (support multiple env names and sources)
    const apiKey = (
      import.meta.env?.VITE_GEMINI_API_KEY ||
      import.meta.env?.VITE_GOOGLE_GEMINI_API_KEY ||
      (typeof window !== 'undefined' ? window?.__ENV__?.VITE_GEMINI_API_KEY : undefined) ||
      (typeof window !== 'undefined' ? window?.__ENV__?.VITE_GOOGLE_GEMINI_API_KEY : undefined) ||
      (typeof window !== 'undefined' ? window?.ENV?.GEMINI_API_KEY : undefined) ||
      (typeof window !== 'undefined' ? window?.ENV?.VITE_GEMINI_API_KEY : undefined) ||
      (typeof window !== 'undefined' ? window?.ENV?.VITE_GOOGLE_GEMINI_API_KEY : undefined)
    );

    if (!apiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY or VITE_GOOGLE_GEMINI_API_KEY in your environment variables.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    const currentSessionId = options.sessionId || this.generateSessionId();
    
    // Create context prompt based on focus area
    let contextPrompt = '';
    switch (options.focusArea) {
      case 'grammar':
        contextPrompt = 'You are an English grammar tutor. Focus on grammar explanations and corrections.';
        break;
      case 'vocabulary':
        contextPrompt = 'You are an English vocabulary tutor. Focus on word meanings, usage, and examples.';
        break;
      case 'pronunciation':
        contextPrompt = 'You are an English pronunciation tutor. Focus on pronunciation guidance and phonetics.';
        break;
      case 'conversation':
      default:
        contextPrompt = 'You are an English conversation tutor. Focus on natural conversation and communication skills.';
        break;
    }

    const fullPrompt = `${contextPrompt}\n\nUser level: ${options.userLevel || 'intermediate'}\n\nUser message: ${message}`;

    try {
      const result = await model.generateContentStream(fullPrompt);
      let fullResponse = '';

      return {
        success: true,
        sessionId: currentSessionId,
        provider: 'direct-gemini-fallback',
        stream: {
          async *[Symbol.asyncIterator]() {
            try {
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  fullResponse += chunkText;
                  yield {
                    chunk: chunkText,
                    fullResponse,
                    done: false
                  };
                }
              }
              return { fullResponse, done: true };
            } catch (error) {
              console.error('Direct Gemini streaming error:', error);
              throw error;
            }
          }
        }
      };
    } catch (error) {
      console.error('Direct Gemini API call failed:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      hasSupabase: !!this.supabase,
      currentSessionId: this.currentSessionId
    };
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async generateVocabIntro(vocabList, cefrLevel) {
    const prompt = `Generate a simple introduction to these vocabulary words: ${vocabList.join(', ')} at CEFR level ${cefrLevel}. Include definitions, examples, and pronunciation tips.`;
    return this.sendMessage(prompt, { focusArea: 'vocabulary' });
  }

  async generateTest(cefrLevel, topic) {
    const prompt = `Create a short test on ${topic} at CEFR level ${cefrLevel}. Include multiple choice questions and answers.`;
    return this.sendMessage(prompt, { focusArea: 'testing' });
  }

  async provideWritingFeedback(text, cefrLevel) {
    const prompt = `Provide constructive feedback on this writing at CEFR level ${cefrLevel}: "${text}". Focus on grammar, vocabulary, and structure improvements.`;
    return this.sendMessage(prompt, { focusArea: 'writing' });
  }

  async generateConvoPractice(topic, cefrLevel) {
    const prompt = `Create a conversation practice scenario about ${topic} suitable for CEFR level ${cefrLevel}. Include dialogue examples and follow-up questions.`;
    return this.sendMessage(prompt, { focusArea: 'conversation' });
  }

  /**
   * Clear a chat session on the backend (best-effort, safe no-op if function missing)
   */
  async clearSession(sessionId) {
    try {
      if (!sessionId) return { success: true };
      await this.initialize();
      // Try to call an Edge Function if available; otherwise no-op
      try {
        const { data, error } = await this.supabase.functions.invoke('clear-chat-session', {
          body: { session_id: sessionId }
        });
        if (error) {
          console.warn('clearSession function error (ignored):', error.message || error);
          return { success: false, error: error.message };
        }
        return { success: true, data };
      } catch (fnError) {
        console.warn('clearSession function missing or failed (ignored):', fnError.message || fnError);
        return { success: true };
      }
    } catch (e) {
      console.warn('clearSession unexpected error (ignored):', e.message || e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Send a message to the live conversation edge function
   * This is specifically for real-time voice conversations
   */
  async sendLiveConversationMessage(message, options = {}) {
    console.log('[SupabaseGeminiService] sendLiveConversationMessage called with:', { message, options });
    
    try {
      await this.initialize();
      
      const sessionId = options.sessionId || this.currentSessionId || crypto.randomUUID();
      
      // Get current user
      let user = options.user;
      if (!user) {
        const { data: { user: authUser }, error: userError } = await this.supabase.auth.getUser();
        if (userError || !authUser) {
          user = { id: '8584505a-79b2-4b39-a368-03045f8a4f6a' };
        } else {
          user = authUser;
        }
      }

      const requestData = {
        message,
        session_id: sessionId,
        user_id: user.id,
        user_level: options.userLevel || 'intermediate',
        focus_area: options.focusArea || 'conversation',
        language: options.language || 'English',
        streaming: options.streaming !== false
      };

      console.log('[SupabaseGeminiService] Calling process-live-conversation with:', requestData);

      if (options.streaming !== false) {
        // Use streaming endpoint for live conversation
        const envSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
        const baseUrl = envSupabaseUrl || supabaseConfig?.url || '';
        const functionUrl = `${baseUrl}/functions/v1/process-live-conversation`;
        
        const { data: { session } } = await this.supabase.auth.getSession();
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        };
        
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
          const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || supabaseConfig?.anonKey;
          if (anonKey) {
            headers['Authorization'] = `Bearer ${anonKey}`;
          }
        }

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body available for streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        return {
          success: true,
          sessionId: sessionId,
          provider: 'supabase-live-conversation',
          stream: {
            async *[Symbol.asyncIterator]() {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    if (buffer.trim()) {
                      const lines = buffer.split('\n');
                      for (const line of lines) {
                        if (line.startsWith('data: ')) {
                          try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content && !data.done) {
                              fullResponse += data.content;
                              yield {
                                chunk: data.content,
                                fullResponse,
                                done: false
                              };
                            }
                            if (data.done) {
                              if (data.fullResponse) {
                                fullResponse = data.fullResponse;
                              }
                              return { fullResponse, done: true };
                            }
                            if (data.error) {
                              throw new Error(data.error);
                            }
                          } catch (e) {
                            console.warn('Failed to parse streaming data:', e);
                          }
                        }
                      }
                    }
                    return { fullResponse, done: true };
                  }

                  const chunk = decoder.decode(value, { stream: true });
                  buffer += chunk;
                  
                  let newlineIndex;
                  while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 2);
                    
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                          throw new Error(data.error);
                        }
                        
                        if (data.content && !data.done) {
                          fullResponse += data.content;
                          yield {
                            chunk: data.content,
                            fullResponse,
                            done: false
                          };
                        }
                        
                        if (data.done) {
                          if (data.fullResponse) {
                            fullResponse = data.fullResponse;
                          }
                          return { fullResponse, done: true };
                        }
                      } catch (e) {
                        console.warn('Failed to parse streaming data:', e);
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Streaming error:', error);
                throw error;
              } finally {
                reader.releaseLock();
              }
            }
          }
        };
      } else {
        // Non-streaming request
        const { data, error } = await this.supabase.functions.invoke('process-live-conversation', {
          body: requestData
        });

        if (error) {
          console.error('Live conversation function error:', error);
          throw error;
        }

        return {
          success: true,
          response: data.response,
          sessionId: sessionId,
          provider: 'supabase-live-conversation'
        };
      }
    } catch (error) {
      console.error('Error in sendLiveConversationMessage:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const supabaseGeminiService = new SupabaseGeminiService();
export default supabaseGeminiService;
