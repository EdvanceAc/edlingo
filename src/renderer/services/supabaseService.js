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

  // Resolve or create the current user's user_profiles.id (may differ from auth uid)
  async getOrCreateUserProfileId() {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return null;

      // 1) Try primary key equality (id === auth uid)
      try {
        const { data } = await this.client
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .limit(1);
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) return row.id;
      } catch (_) {}

      // 2) Try lookup by user_id foreign key
      try {
        const { data } = await this.client
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) return row.id;
      } catch (_) {}

      // 3) Attempt to create via RPC then retry
      try {
        await this.client.rpc('create_missing_user_profile', {
          user_id: user.id,
          user_email: user.email || null,
          user_name: user.user_metadata?.full_name || user.user_metadata?.name || null
        });
      } catch (_) {}

      try {
        const { data } = await this.client
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .limit(1);
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) return row.id;
      } catch (_) {}

      try {
        const { data } = await this.client
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) return row.id;
      } catch (_) {}

      return null;
    } catch (_) {
      return null;
    }
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
        }, {
          onConflict: 'user_id,language'
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
        .limit(1);
      
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST204') throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { success: true, data: row || null };
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

  // Course Enrollment
  async getEnrollment(courseId) {
    try {
      const { data: { user }, error: userErr } = await this.client.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return { success: false, error: 'No authenticated user' };

      const { data, error } = await this.client
        .from('user_course_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      // If table doesn't exist or RLS blocks, return null enrollment gracefully
      if (error.code === '42P01' || (typeof error.message === 'string' && error.message.includes('relation'))) {
        return { success: true, data: null };
      }
      console.error('Get enrollment error:', error);
      return { success: false, error: error.message };
    }
  }

  async enrollInCourse(courseId) {
    try {
      const { data: { user }, error: userErr } = await this.client.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return { success: false, error: 'No authenticated user' };

      // Attempt insert; if FK fails due to missing user_profiles, try to create it via RPC
      const attemptInsert = async () => {
        return await this.client
          .from('user_course_enrollments')
          .upsert({
            user_id: user.id,
            course_id: courseId,
            status: 'enrolled',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,course_id' })
          .select()
          .single();
      };

      let { data, error } = await attemptInsert();
      if (error && (error.code === '23503' || /foreign key/i.test(error.message))) {
        // Ensure profile exists, then retry
        try {
          await this.client.rpc('create_missing_user_profile', {
            user_id: user.id,
            user_email: user.email || null,
            user_name: user.user_metadata?.full_name || user.user_metadata?.name || null
          });
        } catch (_) {}
        const retry = await attemptInsert();
        data = retry.data; error = retry.error;
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Enroll in course error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateEnrollment(courseId, updates) {
    try {
      const { data: { user }, error: userErr } = await this.client.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return { success: false, error: 'No authenticated user' };

      const { data, error } = await this.client
        .from('user_course_enrollments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update enrollment error:', error);
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

  // Notifications & Study Reminders
  async getNotifications(limit = 5) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: true, data: [] };
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      console.error('Get notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  async createStudyReminder({ courseId = null, frequency = 'daily', timeUTC = null, weekday = null }) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };
      const { data, error } = await this.client
        .from('study_reminders')
        .insert({
          user_id: user.id,
          course_id: courseId,
          frequency,
          time_utc: timeUTC,
          weekday,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create study reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  async getStudyReminders() {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: true, data: [] };
      const { data, error } = await this.client
        .from('study_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      console.error('Get study reminders error:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleStudyReminder(reminderId, isActive) {
    try {
      const { data, error } = await this.client
        .from('study_reminders')
        .update({ is_active: !!isActive, updated_at: new Date().toISOString() })
        .eq('id', reminderId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Toggle study reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  // Certificates
  async getCertificateTemplate(courseId) {
    try {
      const { data, error } = await this.client
        .from('certificates')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: null };
      console.error('Get certificate template error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserCertificates(courseId) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: true, data: [] };
      let query = this.client
        .from('user_certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      if (courseId) query = query.eq('course_id', courseId);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      console.error('Get user certificates error:', error);
      return { success: false, error: error.message };
    }
  }

  async awardCertificate(courseId) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };
      const tmplRes = await this.getCertificateTemplate(courseId);
      const template = tmplRes.data;
      if (!template) {
        return { success: false, error: 'No certificate template for this course' };
      }

      // Avoid duplicates
      const existing = await this.getUserCertificates(courseId);
      if (existing.success && existing.data?.length) {
        return { success: true, data: existing.data[0], alreadyHad: true };
      }

      const verification = Math.random().toString(36).slice(2, 10).toUpperCase();
      const { data, error } = await this.client
        .from('user_certificates')
        .insert({
          user_id: user.id,
          certificate_id: template.id,
          course_id: courseId,
          verification_code: verification,
          share_url: null,
          issued_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Award certificate error:', error);
      return { success: false, error: error.message };
    }
  }

  // Wishlist
  async getWishlistCourseIds() {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: true, data: [] };
      const { data, error } = await this.client
        .from('user_course_wishlist')
        .select('course_id')
        .eq('user_id', user.id);
      if (error) throw error;
      const ids = (data || []).map(r => r.course_id);
      return { success: true, data: ids };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      console.error('Get wishlist error:', error);
      return { success: false, error: error.message };
    }
  }

  async addToWishlist(courseId) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };
      const { data, error } = await this.client
        .from('user_course_wishlist')
        .upsert({ user_id: user.id, course_id: courseId })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add to wishlist error:', error);
      return { success: false, error: error.message };
    }
  }

  async removeFromWishlist(courseId) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };
      const { error } = await this.client
        .from('user_course_wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      return { success: false, error: error.message };
    }
  }

  // Course Reviews
  async getCourseReviews(courseId, { limit = 20 } = {}) {
    try {
      const { data, error } = await this.client
        .from('course_reviews')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      console.error('Get course reviews error:', error);
      return { success: false, error: error.message };
    }
  }

  // Lesson Submissions (Answers)
  async upsertLessonSubmission({ courseId, lessonId, textAnswer = null, attachments = [] }) {
    try {
      console.log('🔄 Starting lesson submission save process...');
      console.log('📊 Input parameters:', { courseId, lessonId, textAnswerLength: textAnswer?.length });

      // Validate required parameters
      if (!lessonId) {
        throw new Error('Lesson ID is required');
      }
      if (!textAnswer || textAnswer.trim() === '') {
        console.warn('⚠️ Empty answer, skipping save');
        return { success: false, error: 'Empty answer' };
      }

      // Get current authenticated user
      const { data: { user }, error: authError } = await this.client.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated: ' + (authError?.message || 'No user'));
      }
      console.log('✅ User authenticated:', user.id);

      // Generate UUID for IDs if they're not already UUIDs
      function isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      }

      function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }

      // Ensure IDs are valid UUIDs
      let finalLessonId = lessonId;
      let finalCourseId = courseId;

      if (!isValidUUID(lessonId)) {
        finalLessonId = generateUUID();
        console.log('⚠️ Generated UUID for lesson ID:', finalLessonId);
      }

      if (courseId && !isValidUUID(courseId)) {
        finalCourseId = generateUUID();
        console.log('⚠️ Generated UUID for course ID:', finalCourseId);
      }

      // Try multiple user ID strategies
      const userIdStrategies = [
        { id: user.id, name: 'auth.uid()' }
      ];

      // Add profile ID if available
      try {
        const profileId = await this.getOrCreateUserProfileId();
        if (profileId && profileId !== user.id) {
          userIdStrategies.unshift({ id: profileId, name: 'profile.id' });
        }
      } catch (e) {
        console.log('Could not get profile ID:', e.message);
      }

      console.log('🔄 Trying user ID strategies:', userIdStrategies.map(s => s.name));

      // Try each strategy until one works
      for (const strategy of userIdStrategies) {
        try {
          console.log(`🔄 Attempting save with ${strategy.name}: ${strategy.id}`);

          const payload = {
            user_id: strategy.id,
            course_id: finalCourseId || null,
            lesson_id: finalLessonId,
            text_answer: textAnswer.trim(),
            attachments: Array.isArray(attachments) ? attachments : [],
            status: 'submitted',
            updated_at: new Date().toISOString()
          };

          console.log('📤 Payload:', payload);

          const { data, error } = await this.client
            .from('lesson_submissions')
            .upsert(payload, { onConflict: 'user_id,lesson_id' })
            .select()
            .single();

          if (error) {
            console.log(`❌ ${strategy.name} failed:`, error.message, '(code:', error.code + ')');
            
            // If this is the last strategy, throw the error
            if (strategy === userIdStrategies[userIdStrategies.length - 1]) {
              throw error;
            }
            continue; // Try next strategy
          }

          console.log(`✅ ${strategy.name} succeeded! Submission ID:`, data.id);
          return { success: true, data };

        } catch (strategyError) {
          console.log(`❌ ${strategy.name} strategy failed:`, strategyError.message);
          
          // If this is the last strategy, throw the error
          if (strategy === userIdStrategies[userIdStrategies.length - 1]) {
            throw strategyError;
          }
        }
      }

      throw new Error('All save strategies failed');

    } catch (error) {
      console.error('❌ Upsert lesson submission error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return { success: false, error: error.message };
    }
  }

  async getLessonSubmission(lessonId) {
    try {
      console.log('🔍 Fetching lesson submission for:', lessonId);

      // Get current authenticated user
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) {
        console.log('⚠️ No authenticated user for fetch');
        return { success: true, data: null };
      }

      // Generate UUID for lesson ID if it's not already a UUID
      function isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      }

      // For fetch, we need to be more flexible - try both original ID and generated UUID
      const searchIds = [lessonId];
      if (!isValidUUID(lessonId)) {
        console.log('⚠️ Lesson ID is not UUID format, will search by original ID');
      }

      // Try multiple user ID strategies
      const userIdStrategies = [
        { id: user.id, name: 'auth.uid()' }
      ];

      // Add profile ID if available
      try {
        const profileId = await this.getOrCreateUserProfileId();
        if (profileId && profileId !== user.id) {
          userIdStrategies.unshift({ id: profileId, name: 'profile.id' });
        }
      } catch (e) {
        console.log('Could not get profile ID for fetch:', e.message);
      }

      console.log('🔍 Trying fetch strategies:', userIdStrategies.map(s => s.name));

      // Try each user ID strategy
      for (const strategy of userIdStrategies) {
        try {
          console.log(`🔍 Trying fetch with ${strategy.name}: ${strategy.id}`);

          // Try to find submission with exact lesson ID match
          const { data, error } = await this.client
            .from('lesson_submissions')
            .select('*')
            .eq('user_id', strategy.id)
            .eq('lesson_id', lessonId)
            .maybeSingle();

          if (error) {
            console.log(`❌ ${strategy.name} fetch failed:`, error.message);
            if (strategy === userIdStrategies[userIdStrategies.length - 1]) {
              throw error;
            }
            continue;
          }

          if (data) {
            console.log(`✅ ${strategy.name} found submission:`, data.id);
            return { success: true, data };
          } else {
            console.log(`📭 ${strategy.name} no submission found for lesson ${lessonId}`);
          }

        } catch (strategyError) {
          console.log(`❌ ${strategy.name} fetch strategy failed:`, strategyError.message);
          if (strategy === userIdStrategies[userIdStrategies.length - 1]) {
            if (strategyError.code === '42P01') {
              return { success: true, data: null }; // Table doesn't exist
            }
            throw strategyError;
          }
        }
      }

      // If no exact match, try to find any submission for this user (for debugging)
      console.log('🔍 No exact match found, checking for any user submissions...');
      const { data: anySubmissions, error: anyError } = await this.client
        .from('lesson_submissions')
        .select('lesson_id, text_answer, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!anyError && anySubmissions?.length > 0) {
        console.log('📚 Found other submissions for this user:');
        anySubmissions.forEach((sub, i) => {
          console.log(`  ${i + 1}. ${sub.lesson_id}: "${sub.text_answer?.substring(0, 30)}..." (${new Date(sub.created_at).toLocaleDateString()})`);
        });
      }

      return { success: true, data: null };

    } catch (error) {
      if (error.code === '42P01') {
        console.log('⚠️ lesson_submissions table does not exist');
        return { success: true, data: null };
      }
      console.error('❌ Get lesson submission error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCourseAverageRating(courseId) {
    try {
      const { data, error } = await this.client
        .from('course_reviews')
        .select('rating')
        .eq('course_id', courseId);
      if (error) throw error;
      const ratings = (data || []).map(r => Number(r.rating) || 0);
      const avg = ratings.length ? ratings.reduce((a,b)=>a+b,0) / ratings.length : 0;
      return { success: true, data: { average: avg, count: ratings.length } };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: { average: 0, count: 0 } };
      console.error('Get course average rating error:', error);
      return { success: false, error: error.message };
    }
  }

  async addCourseReview(courseId, { rating, title, content }) {
    try {
      const { data: { user }, error: userErr } = await this.client.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return { success: false, error: 'No authenticated user' };

      // Ensure user profile exists
      try {
        await this.client.rpc('create_missing_user_profile', {
          user_id: user.id,
          user_email: user.email || null,
          user_name: user.user_metadata?.full_name || user.user_metadata?.name || null
        });
      } catch (_) {}

      const { data, error } = await this.client
        .from('course_reviews')
        .upsert({
          course_id: courseId,
          user_id: user.id,
          rating: Math.max(1, Math.min(5, Number(rating) || 0)),
          title: title || null,
          content: content || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_id,user_id' })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add course review error:', error);
      return { success: false, error: error.message };
    }
  }

  async markReviewHelpful(reviewId) {
    try {
      const { data, error } = await this.client.rpc('increment_helpful_count', { review_id: reviewId });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      // fallback without RPC
      try {
        const { data: row } = await this.client
          .from('course_reviews')
          .select('helpful_count')
          .eq('id', reviewId)
          .single();
        const next = (row?.helpful_count || 0) + 1;
        const { data } = await this.client
          .from('course_reviews')
          .update({ helpful_count: next, updated_at: new Date().toISOString() })
          .eq('id', reviewId)
          .select()
          .single();
        return { success: true, data };
      } catch (err) {
        console.error('Mark review helpful error:', err);
        return { success: false, error: err.message };
      }
    }
  }
}

// Create and export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;