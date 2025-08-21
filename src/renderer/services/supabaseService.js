import { supabase, checkSupabaseConnection } from '../config/supabaseConfig.js';
import supabaseStorageService from './supabaseStorageService.js';

/**
 * Supabase Database Service
 * Handles all database operations for EdLingo app
 */
class SupabaseService {
  constructor() {
    this.client = supabase;
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      const connectionStatus = await checkSupabaseConnection();
      this.isConnected = connectionStatus.connected;
      
      if (this.isConnected) {
        console.log('✅ Supabase connected successfully');
        // Test if required tables exist
        await this.verifyDatabaseSchema();
      } else {
        console.warn('⚠️ Supabase connection failed:', connectionStatus.error);
        console.warn('📋 Please check SETUP_DATABASE.md for database setup instructions');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Supabase service:', error);
      console.warn('📋 Please check SETUP_DATABASE.md for database setup instructions');
    }
  }

  async verifyDatabaseSchema() {
    try {
      // Test if core tables exist by attempting a simple query
      const { error } = await this.client
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.error('❌ Database tables not found. Please run the database migration.');
        console.warn('📋 See SETUP_DATABASE.md for setup instructions');
        this.isConnected = false;
      }
    } catch (error) {
      console.warn('⚠️ Could not verify database schema:', error.message);
    }
  }

  // Connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // User Management
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) throw error;
      return { success: true, user };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error: error.message };
    }
  }

  async signInWithGoogle() {
    try {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async resetPassword(email) {
    try {
      const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePassword(newPassword) {
    try {
      const { data, error } = await this.client.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSession() {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      return { success: true, session };
    } catch (error) {
      console.error('Get session error:', error);
      return { success: false, error: error.message };
    }
  }

  onAuthStateChange(callback) {
    return this.client.auth.onAuthStateChange(callback);
  }

  // User Progress Management
  async saveUserProgress(userId, progressData) {
    try {
      // Map JS keys to DB column names to avoid PGRST204 for non-existent columns
      const COLUMN_MAP = {
        totalXP: 'total_xp',
        level: 'current_level',
        streak: 'daily_streak',
        daily_goal: 'daily_goal',
        daily_progress: 'daily_progress',
        lastStudyDate: 'last_study_date',
        total_lessons_completed: 'lessons_completed',
        pronunciationAccuracy: 'pronunciation_accuracy',
        chat_messages: 'chat_messages',
        achievements: 'achievements',
        language: 'language'
      };

      const mappedProgress = {};
      if (progressData && typeof progressData === 'object') {
        Object.entries(COLUMN_MAP).forEach(([jsKey, dbKey]) => {
          if (Object.prototype.hasOwnProperty.call(progressData, jsKey)) {
            mappedProgress[dbKey] = progressData[jsKey];
          }
        });
      }

      const { data, error } = await this.client
        .from('user_progress')
        .upsert({
          user_id: userId,
          ...mappedProgress,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Save progress error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProgress(userId) {
    try {
      const { data, error } = await this.client
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST204') throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Get progress error:', error);
      return { success: false, error: error.message };
    }
  }

  // Learning Sessions
  async saveLearningSession(userId, sessionData) {
    try {
      const { data, error } = await this.client
        .from('learning_sessions')
        .insert({
          user_id: userId,
          ...sessionData,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Save session error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSessions(userId, limit = 10) {
    try {
      const { data, error } = await this.client
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Get sessions error:', error);
      return { success: false, error: error.message };
    }
  }

  // Vocabulary Management
  async saveVocabulary(userId, vocabularyData) {
    try {
      if (!this.isConnected) {
        return { 
          success: false, 
          error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.' 
        };
      }

      const { data, error } = await this.client
        .from('user_vocabulary')
        .upsert({
          user_id: userId,
          ...vocabularyData,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        if (error.code === '42P01') {
          return { 
            success: false, 
            error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md' 
          };
        }
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      console.error('Save vocabulary error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to save vocabulary. Please check your database connection.' 
      };
    }
  }

  async getUserVocabulary(userId) {
    try {
      if (!this.isConnected) {
        return { 
          success: false, 
          error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.',
          data: [] 
        };
      }

      const { data, error } = await this.client
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
          return { 
            success: false, 
            error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md',
            data: [] 
          };
        }
        throw error;
      }
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Get vocabulary error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to load vocabulary. Please check your database connection.',
        data: [] 
      };
    }
  }

  // Real-time subscriptions
  subscribeToUserProgress(userId, callback) {
    return this.client
      .channel('user_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  // Assessment Management
  async createAssessmentSession(userId, targetLanguage, assessmentType) {
    try {
      const { data, error } = await this.client
        .from('assessment_sessions')
        .insert({
          user_id: userId,
          target_language: targetLanguage,
          assessment_type: assessmentType,
          status: 'in_progress',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create assessment session error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAssessmentTasks(sessionId) {
    try {
      const { data, error } = await this.client
        .from('assessment_tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('task_order');
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Get assessment tasks error:', error);
      return { success: false, error: error.message };
    }
  }

  async submitAssessmentResponse(taskId, response, audioUrl = null) {
    try {
      const { data, error } = await this.client
        .from('assessment_tasks')
        .update({
          user_response: response,
          audio_response_url: audioUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Submit assessment response error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAssessmentSession(sessionId, updates) {
    try {
      const { data, error } = await this.client
        .from('assessment_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update assessment session error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAssessmentCriteria(skillArea, cefrLevel) {
    try {
      const { data, error } = await this.client
        .from('assessment_criteria')
        .select('*')
        .eq('skill_area', skillArea)
        .eq('cefr_level', cefrLevel)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Get assessment criteria error:', error);
      return { success: false, error: error.message };
    }
  }

  async saveUserProficiencyProfile(userId, proficiencyData) {
    try {
      const { data, error } = await this.client
        .from('user_proficiency_profiles')
        .upsert({
          user_id: userId,
          ...proficiencyData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Save proficiency profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProficiencyProfile(userId) {
    try {
      const { data, error } = await this.client
        .from('user_proficiency_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Get proficiency profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Content Modules Management
  async getContentModules(language = null, cefrLevel = null, moduleType = null) {
    try {
      let query = this.client
        .from('content_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (language) query = query.eq('language', language);
      if (cefrLevel) query = query.eq('cefr_level', cefrLevel);
      if (moduleType) query = query.eq('module_type', moduleType);
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Get content modules error:', error);
      return { success: false, error: error.message };
    }
  }

  async getContentModule(moduleId) {
    try {
      const { data, error } = await this.client
        .from('content_modules')
        .select('*')
        .eq('id', moduleId)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get content module error:', error);
      return { success: false, error: error.message };
    }
  }

  async createContentModule(moduleData) {
    try {
      const { data, error } = await this.client
        .from('content_modules')
        .insert({
          ...moduleData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create content module error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateContentModule(moduleId, updates) {
    try {
      const { data, error } = await this.client
        .from('content_modules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', moduleId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update content module error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteContentModule(moduleId) {
    try {
      const { data, error } = await this.client
        .from('content_modules')
        .update({ is_active: false })
        .eq('id', moduleId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Delete content module error:', error);
      return { success: false, error: error.message };
    }
  }

  // Assignments and Tests (using content_modules table)
  async getAssignment(assignmentId) {
    try {
      const { data, error } = await this.client
        .from('content_modules')
        .select('*')
        .eq('id', assignmentId)
        .eq('module_type', 'assignment')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get assignment error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTest(testId) {
    try {
      const { data, error } = await this.client
        .from('content_modules')
        .select('*')
        .eq('id', testId)
        .eq('module_type', 'test')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get test error:', error);
      return { success: false, error: error.message };
    }
  }

  // CEFR Assessment Questions Management
  async createCEFRAssessmentQuestion(questionData) {
    try {
      const { data, error } = await this.client
        .from('cefr_assessment_questions')
        .insert({
          question_type: questionData.questionType,
          cefr_level: questionData.cefrLevel,
          skill_type: questionData.skillType,
          question_text: questionData.questionText,
          instructions: questionData.instructions,
          points: questionData.points,
          options: questionData.options || null,
          correct_answer: questionData.correctAnswer || null,
          media_files: questionData.mediaFiles || null,
          assessment_criteria: questionData.assessmentCriteria || null,
          expected_response: questionData.expectedResponse || null,
          difficulty_level: questionData.difficultyLevel || 'medium',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create CEFR assessment question error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCEFRAssessmentQuestions(filters = {}) {
    try {
      let query = this.client
        .from('cefr_assessment_questions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (filters.cefrLevel) query = query.eq('cefr_level', filters.cefrLevel);
      if (filters.skillType) query = query.eq('skill_type', filters.skillType);
      if (filters.questionType) query = query.eq('question_type', filters.questionType);
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Get CEFR assessment questions error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCEFRAssessmentQuestion(questionId, updates) {
    try {
      const { data, error } = await this.client
        .from('cefr_assessment_questions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update CEFR assessment question error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCEFRAssessmentQuestion(questionId) {
    try {
      const { data, error } = await this.client
        .from('cefr_assessment_questions')
        .update({ is_active: false })
        .eq('id', questionId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Delete CEFR assessment question error:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility methods
  async testConnection() {
    return await checkSupabaseConnection();
  }

  async syncData() {
    try {
      // Implement data synchronization logic here
      console.log('🔄 Starting data sync...');
      
      // Example: sync user progress, vocabulary, etc.
      const user = await this.getCurrentUser();
      if (user.success && user.user) {
        const progress = await this.getUserProgress(user.user.id);
        const vocabulary = await this.getUserVocabulary(user.user.id);
        const sessions = await this.getUserSessions(user.user.id, 5);
        
        console.log('✅ Data sync completed');
        return {
          success: true,
          data: {
            progress: progress.data,
            vocabulary: vocabulary.data,
            sessions: sessions.data
          }
        };
      }
      
      return { success: false, error: 'No authenticated user' };
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getCourseByLevel(cefrLevel) {
    try {
      const { data, error } = await this.client
        .from('courses')
        .select('*')
        .eq('cefr_level', cefrLevel);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get courses by level error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadPDFWithHighlights(file, highlights) {
    try {
      const metadata = { highlights: JSON.stringify(highlights) };
      const result = await supabaseStorageService.uploadFile(
        file,
        'course-materials',
        'pdfs',
        metadata
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Upload PDF with highlights error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;