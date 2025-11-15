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

    // Precompiled regex for username policy (Instagram/Telegram-like)
    // Allowed: a-z 0-9 . _ ; 3–32 chars; cannot start/end with . or _; no consecutive .. or __ or ._
    this.USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-z0-9._]{3,32}(?<![._])$/;
  }

  // ---------- Username helpers ----------
  sanitizeToHandle(input) {
    if (!input || typeof input !== 'string') return '';
    let s = input.trim().toLowerCase();

    // Replace Persian/Arabic digits with Latin
    const digitMap = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
    s = s.replace(/[۰-۹]/g, (d) => digitMap[d] || d);

    // Basic transliteration: remove diacritics
    try {
      s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    } catch (_) {}

    // Convert spaces and hyphens to dots
    s = s.replace(/[\s-]+/g, '.');

    // Remove all disallowed characters
    s = s.replace(/[^a-z0-9._]/g, '');

    // Collapse consecutive dots/underscores
    s = s.replace(/[._]{2,}/g, '.');

    // Trim leading/trailing dot/underscore
    s = s.replace(/^[._]+|[._]+$/g, '');

    // Enforce length
    if (s.length < 3) return s; // we'll pad later
    if (s.length > 32) s = s.slice(0, 32);
    return s;
  }

  generateUsernameBase({ name, email, fallback = 'user' } = {}) {
    const fromName = this.sanitizeToHandle(name || '');
    if (fromName && fromName.length >= 3) return fromName;
    const fromEmail = this.sanitizeToHandle(String(email || '').split('@')[0] || '');
    if (fromEmail && fromEmail.length >= 3) return fromEmail;
    return fallback;
  }

  async ensureUserHasUsername() {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };

      // Fetch current username quickly
      const existing = await this.client
        .from('user_profiles')
        .select('id,username,full_name,email')
        .eq('id', user.id)
        .maybeSingle();

      const current = existing?.data?.username;
      if (current && typeof current === 'string' && this.USERNAME_REGEX.test(current)) {
        return { success: true, username: current };
      }

      // Build a strong base
      const base = this.generateUsernameBase({
        name: existing?.data?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name,
        email: existing?.data?.email || user?.email
      }) || 'user';

      // Ensure min length
      const pad = (str) => (str.length >= 3 ? str : (str + 'user')).slice(0, Math.max(3, str.length));
      const b = pad(base);

      // Try multiple variants
      const candidates = [];
      candidates.push(b);
      // use parts of uuid to avoid collisions
      const uid = (user.id || '').replace(/-/g, '');
      if (uid.length >= 4) candidates.push(`${b}.${uid.slice(0, 4)}`);
      if (uid.length >= 6) candidates.push(`${b}.${uid.slice(-6)}`);
      // numeric suffixes
      for (let i = 0; i < 8; i++) {
        const rnd = Math.floor(Math.random() * 9000) + 1000;
        candidates.push(`${b}.${rnd}`);
      }

      // Validate and check availability
      for (const c of candidates) {
        const handle = c.slice(0, 32).replace(/[._]{2,}/g, '.').replace(/^[._]+|[._]+$/g, '');
        if (!this.USERNAME_REGEX.test(handle)) continue;
        const { success, available } = await this.checkUsernameAvailable(handle);
        if (success && available) {
          // Persist
          const saved = await this.updateUserProfile({ username: handle });
          if (saved.success) return { success: true, username: handle };
        }
      }

      // Final fallback
      const fallback = `${b}.${Math.random().toString(36).slice(2, 8)}`.slice(0, 32);
      const saved = await this.updateUserProfile({ username: fallback });
      if (saved.success) return { success: true, username: fallback };
      return { success: false, error: 'Failed to assign username' };
    } catch (e) {
      return { success: false, error: e.message };
    }
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
          redirectTo: `${window.location.origin}/auth/callback`
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

  // ---------------- User Profile -----------------
  async getUserProfile() {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: true, data: null };

      // Try primary key (id === auth.uid())
      let { data, error } = await this.client
        .from('user_profiles')
        .select('id,email,full_name,username,avatar_url,target_language,native_language,placement_level')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Fallback by user_id relationship if schema differs
        const res = await this.client
          .from('user_profiles')
          .select('id,email,full_name,username,avatar_url,target_language,native_language,placement_level')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        data = Array.isArray(res.data) ? res.data[0] : res.data;
      }

      // If username missing, attempt to auto-generate and refetch once
      if (!data?.username) {
        await this.ensureUserHasUsername();
        const refetch = await this.client
          .from('user_profiles')
          .select('id,email,full_name,username,avatar_url,target_language,native_language,placement_level')
          .eq('id', user.id)
          .maybeSingle();
        if (!refetch.error) data = refetch.data || data;
      }

      return { success: true, data: data || null };
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(updates = {}) {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };

      // Normalize username ONLY if provided: empty string => null, trim spaces
      let normalizedUsername;
      const hasUsername = Object.prototype.hasOwnProperty.call(updates, 'username');
      if (hasUsername) {
        if (typeof updates.username === 'string') {
          const t = updates.username.trim();
          normalizedUsername = t.length ? t : null;
        } else {
          normalizedUsername = updates.username ?? null;
        }
      }

      // Ensure profile row exists (RLS allows inserting own row)
      try {
        const existing = await this.client
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (!existing.data) {
          await this.client
            .from('user_profiles')
            .upsert({ id: user.id, email: user.email || null })
            .select()
            .maybeSingle();
        }
      } catch (_) {
        try {
          await this.client.rpc('create_missing_user_profile', {
            user_id: user.id,
            user_email: user.email || null,
            user_name: user.user_metadata?.full_name || user.user_metadata?.name || null
          });
        } catch (_) {}
      }

      // Build payload ONLY with provided fields to avoid nulling existing values
      const payload = { updated_at: new Date().toISOString() };
      if (Object.prototype.hasOwnProperty.call(updates, 'full_name')) {
        payload.full_name = updates.full_name ?? null;
      }
      if (hasUsername) {
        payload.username = normalizedUsername;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'target_language')) {
        payload.target_language = updates.target_language ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'native_language')) {
        payload.native_language = updates.native_language ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'placement_level')) {
        payload.placement_level = updates.placement_level ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'avatar_url')) {
        payload.avatar_url = updates.avatar_url ?? null;
      }

      // Prefer UPSERT to avoid representation issues and ensure row exists
      const upsertPayload = { id: user.id, email: user.email || null, ...payload };
      let { data, error } = await this.client
        .from('user_profiles')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      // If UPSERT is not allowed (older schema), fallback to update paths
      if (error) {
        // Try updating by PK first
        let query = this.client.from('user_profiles').update(payload).eq('id', user.id).select().maybeSingle();
        let res = await query;
        data = res.data; error = res.error;

        // If no row updated (or schema uses user_id), try user_id fallback
        if ((error?.code === 'PGRST116') || (!error && !data)) {
          const res2 = await this.client
            .from('user_profiles')
            .update(payload)
            .eq('user_id', user.id)
            .select()
            .maybeSingle();
          data = res2.data; error = res2.error;
        }
      }

      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      // Handle unique constraint violation cleanly
      if (error?.code === '23505' && /username/i.test(error?.message || '')) {
        return { success: false, error: 'Username already taken' };
      }
      console.error('Update user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async checkUsernameAvailable(username) {
    try {
      if (!username || typeof username !== 'string') {
        return { success: false, available: false, error: 'Invalid username' };
      }

      // Normalize for case-insensitive check
      const normalized = username.trim();
      if (!normalized) return { success: false, available: false, error: 'Invalid username' };

      const { data: { user } } = await this.client.auth.getUser();
      const myId = user?.id || null;

      // Use ilike for case-insensitive, exact-match pattern
      let query = this.client
        .from('user_profiles')
        .select('id,username')
        .ilike('username', normalized)
        .limit(1);

      if (myId) query = query.neq('id', myId);

      const { data, error } = await query;
      if (error && error.code !== 'PGRST116') throw error;

      const taken = Array.isArray(data) ? data.length > 0 : !!data;
      return { success: true, available: !taken };
    } catch (error) {
      console.error('Check username availability error:', error);
      return { success: false, available: false, error: error.message };
    }
  }

  async uploadAvatar(file, onProgress = null) {
    try {
      if (!file) return { success: false, error: 'No file provided' };

      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return { success: false, error: 'No authenticated user' };

      const result = await supabaseStorageService.uploadFile(
        file,
        'shared-resources', // Reuse existing public bucket to avoid missing-bucket failures
        `avatars/${user.id}`,
        { contentType: file.type },
        typeof onProgress === 'function' ? onProgress : null
      );

      // Persist URL on profile
      await this.updateUserProfile({ avatar_url: result.url });

      return { success: true, data: result };
    } catch (error) {
      console.error('Upload avatar error:', error);
      return { success: false, error: error.message };
    }
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

  // Chat Reactions
  async saveChatReaction({ userId, sessionId = null, messageId, reaction, messageContent = null }) {
    try {
      if (!this.isConnected) {
        return {
          success: false,
          error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.'
        };
      }
      if (!userId) {
        return { success: false, error: 'No authenticated user' };
      }
      if (!messageId) {
        return { success: false, error: 'Missing messageId' };
      }
      // Allow clearing reactions by sending null -> delete row

      const payload = {
        user_id: userId,
        session_id: sessionId,
        message_id: String(messageId),
        reaction,
        message_excerpt: messageContent ? String(messageContent).slice(0, 200) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: existing, error: selErr } = await this.client
        .from('chat_reactions')
        .select('id')
        .eq('user_id', userId)
        .eq('message_id', String(messageId))
        .eq('session_id', sessionId)
        .limit(1);

      if (selErr && selErr.code === '42P01') {
        return {
          success: false,
          error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md'
        };
      }
      if (selErr && selErr.code !== 'PGRST116') throw selErr;

      if (Array.isArray(existing) && existing.length > 0) {
        if (reaction == null) {
          const { error } = await this.client.from('chat_reactions').delete().eq('id', existing[0].id);
          if (error && error.code !== 'PGRST116') throw error;
          return { success: true, data: null };
        }
        const { data, error } = await this.client
          .from('chat_reactions')
          .update({ reaction, updated_at: new Date().toISOString() })
          .eq('id', existing[0].id)
          .select()
          .single();
        if (error) throw error;
        return { success: true, data };
      }

      if (reaction == null) {
        return { success: true, data: null };
      }
      const { data, error } = await this.client
        .from('chat_reactions')
        .insert(payload)
        .select()
        .single();
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
      console.error('Save chat reaction error:', error);
      return { success: false, error: error.message || 'Failed to save reaction' };
    }
  }

  // Chat Sessions & Messages
  async createChatSession(userId, initialTitle = null) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.' };
      }
      if (!userId) {
        return { success: false, error: 'No authenticated user' };
      }
      const payload = {
        user_id: userId,
        title: initialTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      };
      const { data, error } = await this.client
        .from('chat_sessions')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (error.code === '42P01') {
          return { success: false, error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md' };
        }
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      console.error('Create chat session error:', error);
      return { success: false, error: error.message || 'Failed to create chat session' };
    }
  }

  async listChatSessions(userId, limit = 50) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.', data: [] };
      }
      if (!userId) {
        return { success: false, error: 'No authenticated user', data: [] };
      }
      const { data, error } = await this.client
        .from('chat_sessions')
        .select('id,title,created_at,updated_at,last_message_at')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(limit);
      if (error) {
        if (error.code === '42P01') {
          return { success: false, error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md', data: [] };
        }
        throw error;
      }
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('List chat sessions error:', error);
      return { success: false, error: error.message || 'Failed to list chat sessions', data: [] };
    }
  }

  async getChatMessages(sessionId) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.', data: [] };
      }
      if (!sessionId) {
        return { success: false, error: 'Session ID is required', data: [] };
      }
      // Try RPC first
      const { data, error } = await this.client.rpc('get_chat_messages_for_session', { p_session_id: sessionId });
      if (!error) {
        return { success: true, data: data || [] };
      }
      // Fallback: direct select guarded by RLS
      let q = this.client
        .from('chat_messages')
        .select('id, session_id, user_id, content, message, message_type, is_user, created_at')
        .or(`session_id.eq.${sessionId},chat_id.eq.${sessionId}`)
        .order('created_at', { ascending: true });
      const { data: fallData, error: fallErr } = await q;
      if (fallErr) throw fallErr;
      return { success: true, data: fallData || [] };
    } catch (error) {
      console.error('Get chat messages error:', error);
      return { success: false, error: error.message || 'Failed to get chat messages', data: [] };
    }
  }

  async saveChatMessage({ sessionId, userId, role, content, metadata = null, audioUrl = null, model = null, inputTokens = null, outputTokens = null }) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.' };
      }
      if (!sessionId || !userId || !role || !content) {
        return { success: false, error: 'Missing required fields (sessionId, userId, role, content)' };
      }
      // Align with current DB schema: message_type/content columns exist; drop unsupported fields
      // Generate an id client-side so we don't need returning representation (avoids SELECT policy during insert)
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : (Math.random().toString(16).slice(2) + '-' + Date.now());

      const payload = {
        id: generatedId,
        session_id: sessionId,
        chat_id: sessionId, // keep legacy column satisfied
        user_id: userId,
        content,
        message: content, // legacy column compatibility
        is_user: role !== 'assistant',
        message_type: role === 'assistant' ? 'assistant' : 'user',
        user_level: metadata?.userLevel || metadata?.level || null,
        focus_area: metadata?.focusArea || null,
        created_at: new Date().toISOString()
      };
      const { error } = await this.client
        .from('chat_messages')
        .insert(payload);
      if (error) {
        if (error.code === '42P01') {
          return { success: false, error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md' };
        }
        throw error;
      }
      // Update session with latest info
      await this.client
        .from('chat_sessions')
        .update({
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          title: role === 'user' ? (content?.slice(0, 60) || 'New Chat') : undefined
        })
        .eq('id', sessionId);
      return { success: true, data: { id: generatedId } };
    } catch (error) {
      console.error('Save chat message error:', error);
      return { success: false, error: error.message || 'Failed to save chat message' };
    }
  }

  async updateChatSession(sessionId, updates) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.' };
      }
      const { data, error } = await this.client
        .from('chat_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) {
        if (error.code === '42P01') {
          return { success: false, error: 'Database tables not found. Please run the database migration. See SETUP_DATABASE.md' };
        }
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      console.error('Update chat session error:', error);
      return { success: false, error: error.message || 'Failed to update chat session' };
    }
  }

  async renameChatSession(sessionId, title) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.' };
      }
      if (!sessionId || !title) {
        return { success: false, error: 'Missing required fields (sessionId, title)' };
      }
      try {
        const { data, error } = await this.client.rpc('rename_chat_session', {
          p_session_id: sessionId,
          p_title: title
        });
        if (error) throw error;
        return { success: true, data };
      } catch (rpcErr) {
        return await this.updateChatSession(sessionId, { title });
      }
    } catch (error) {
      console.error('Rename chat session error:', error);
      return { success: false, error: error.message || 'Failed to rename chat session' };
    }
  }

  async deleteChatSession(sessionId) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected. Please check SETUP_DATABASE.md for setup instructions.' };
      }
      if (!sessionId) {
        return { success: false, error: 'Missing required field (sessionId)' };
      }

      // Try RPC first if available
      try {
        const { error } = await this.client.rpc('delete_chat_session_and_messages', { p_session_id: sessionId });
        if (!error) return { success: true };
      } catch (_) {
        // fall through to direct deletes
      }

      // Fallback: delete messages then the session under RLS
      const { data: { user } = {} } = await this.client.auth.getUser();
      const userId = user?.id || null;

      // Delete messages for this session (scoped by user if present)
      let q1 = this.client.from('chat_messages').delete().eq('session_id', sessionId);
      if (userId) q1 = q1.eq('user_id', userId);
      const { error: dmError } = await q1;
      if (dmError && dmError.code !== 'PGRST116') { // ignore no rows deleted
        throw dmError;
      }

      // Delete the session row (also scope by user for RLS)
      let q2 = this.client.from('chat_sessions').delete().eq('id', sessionId);
      if (userId) q2 = q2.eq('user_id', userId);
      const { error: dsError } = await q2;
      if (dsError) throw dsError;

      return { success: true };
    } catch (error) {
      console.error('Delete chat session error:', error);
      return { success: false, error: error.message || 'Failed to delete chat session' };
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

  subscribeToSessionMessages(sessionId, onInsert) {
    if (!this.isConnected || !sessionId) return null;
    const channel = this.client
      .channel(`chat_session_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => { try { onInsert && onInsert(payload?.new || payload?.record || null); } catch (_) {} }
      )
      .subscribe();
    return channel;
  }

  async getChatReactions(sessionId) {
    try {
      if (!this.isConnected) {
        return { success: false, error: 'Database not connected.', data: [] };
      }
      const { data: { user } = {} } = await this.client.auth.getUser();
      if (!user) return { success: true, data: [] };
      let query = this.client
        .from('chat_reactions')
        .select('message_id,reaction,updated_at')
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      const map = {};
      (data || []).forEach(r => { map[String(r.message_id)] = r.reaction; });
      return { success: true, data: map };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: {} };
      console.error('Get chat reactions error:', error);
      return { success: false, error: error.message, data: {} };
    }
  }

  removeChannel(channel) {
    if (channel) {
      try { this.client.removeChannel(channel); } catch (_) {}
    }
  }

  // ---------------- Enhanced Chat (independent storage) -----------------
  async createEnhancedSession(userId, initialTitle = null) {
    try {
      if (!this.isConnected) return { success: false, error: 'DB not connected' };
      const { data, error } = await this.client
        .from('enhanced_chat_sessions')
        .insert({ user_id: userId, title: initialTitle, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async listEnhancedSessions(userId, limit = 50) {
    try {
      const { data, error } = await this.client
        .from('enhanced_chat_sessions')
        .select('id,title,created_at,updated_at,last_message_at')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) { return { success: false, error: e.message, data: [] }; }
  }

  async getEnhancedMessages(sessionId) {
    try {
      const { data, error } = await this.client.rpc('get_enhanced_messages_for_session', { p_session_id: sessionId });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) {
      try {
        const { data, error } = await this.client
          .from('enhanced_chat_messages')
          .select('id, session_id, user_id, content, message_type, created_at')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return { success: true, data: data || [] };
      } catch (err) { return { success: false, error: err.message, data: [] }; }
    }
  }

  async saveEnhancedMessage({ sessionId, userId, role, content, metadata = {} }) {
    try {
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(16).slice(2) + '-' + Date.now());
      const payload = { id: generatedId, session_id: sessionId, user_id: userId, content, message_type: role === 'assistant' ? 'assistant' : 'user', mode: metadata?.mode || null, difficulty: metadata?.difficulty || null, created_at: new Date().toISOString() };
      const { error } = await this.client.from('enhanced_chat_messages').insert(payload);
      if (error) throw error;
      await this.client.from('enhanced_chat_sessions').update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString(), title: role === 'user' ? (content?.slice(0,60) || 'New Chat') : undefined }).eq('id', sessionId);
      return { success: true, data: { id: generatedId } };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async renameEnhancedSession(sessionId, title) {
    try {
      const { data, error } = await this.client
        .from('enhanced_chat_sessions')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async deleteEnhancedSession(sessionId) {
    try {
      await this.client.from('enhanced_chat_messages').delete().eq('session_id', sessionId);
      const { error } = await this.client.from('enhanced_chat_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  }

  subscribeToEnhancedMessages(sessionId, onInsert) {
    if (!this.isConnected || !sessionId) return null;
    const channel = this.client
      .channel(`enhanced_chat_session_${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enhanced_chat_messages', filter: `session_id=eq.${sessionId}` }, (payload) => { try { onInsert && onInsert(payload?.new || payload?.record || null); } catch (_) {} })
      .subscribe();
    return channel;
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
        .select('id,title,content,type,created_at,is_read,is_visible,priority,action_url,metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const normalized = (data || [])
        .filter((row) => row.is_visible !== false)
        .map((row) => ({
          ...row,
          title: row.title || 'Notification',
          metadata: row.metadata || {}
        }));
      return { success: true, data: normalized };
    } catch (error) {
      if (error.code === '42P01') return { success: true, data: [] };
      console.error('Get notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  async markNotificationRead(notificationId, isRead = true) {
    if (!notificationId) return { success: false, error: 'Notification id is required' };
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ is_read: !!isRead })
        .eq('id', notificationId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Mark notification read error:', error);
      return { success: false, error: error.message };
    }
  }

  async markNotificationsRead(notificationIds = []) {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return { success: true };
    }
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Bulk mark notifications read error:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleNotificationVisibility(notificationId, isVisible = true) {
    if (!notificationId) return { success: false, error: 'Notification id is required' };
    try {
      const { data, error } = await this.client
        .from('notifications')
        .update({ is_visible: !!isVisible })
        .eq('id', notificationId)
        .select('id,is_visible')
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Toggle notification visibility error:', error);
      return { success: false, error: error.message };
    }
  }

  subscribeToNotifications(userId, handler, statusCallback) {
    try {
      if (!userId || typeof this.client.channel !== 'function') {
        return null;
      }
      const channel = this.client
        .channel(`notifications:user:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          handler
        );
      channel.subscribe((status) => statusCallback?.(status));
      return channel;
    } catch (error) {
      console.error('Notification subscription error:', error);
      return null;
    }
  }

  subscribeToNotificationFeed(handler, statusCallback, filter = null) {
    try {
      if (typeof this.client.channel !== 'function') {
        return null;
      }
      const channel = this.client
        .channel(`notifications:admin:${filter || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            ...(filter ? { filter } : {})
          },
          handler
        );
      channel.subscribe((status) => statusCallback?.(status));
      return channel;
    } catch (error) {
      console.error('Admin notification feed subscription error:', error);
      return null;
    }
  }

  async getAdminNotifications(limit = 50) {
    try {
      const { data, error } = await this.client
        .from('notifications')
        .select(`
          id,
          user_id,
          title,
          content,
          type,
          priority,
          is_read,
          is_visible,
          created_at,
          action_url,
          metadata,
          user_profiles(full_name,email,username)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Admin get notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  async adminDispatchNotification({
    title,
    content,
    type = 'info',
    priority = 'normal',
    audience = 'all',
    targetIdentifiers = [],
    courseIds = [],
    actionUrl = null,
    metadata = {},
    isVisible = true
  } = {}) {
    try {
      const metadataPayload = metadata && typeof metadata === 'object' ? metadata : {};
      const payload = {
        p_title: title,
        p_content: content,
        p_type: type,
        p_priority: priority,
        p_audience: audience,
        p_target_identifiers: Array.isArray(targetIdentifiers) && targetIdentifiers.length ? targetIdentifiers : null,
        p_course_ids: Array.isArray(courseIds) && courseIds.length ? courseIds : null,
        p_action_url: actionUrl || null,
        p_metadata: metadataPayload,
        p_is_visible: isVisible
      };
      const { data, error } = await this.client.rpc('admin_dispatch_notification', payload);
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Admin dispatch notification error:', error);
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