import supabaseService from './supabaseService.js';
import { AppConfig } from '../../config/AppConfig.js';

/**
 * Database Sync Service
 * Handles synchronization between local storage and Supabase
 */
class DatabaseSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.config = AppConfig.get().database;
    
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Connection restored - starting sync');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Connection lost - switching to offline mode');
    });

    // Start periodic sync if online
    if (this.isOnline && AppConfig.isDatabaseEnabled()) {
      this.startPeriodicSync();
    }

    // Load pending sync queue from localStorage
    this.loadSyncQueue();
  }

  // Sync queue management
  loadSyncQueue() {
    try {
      const stored = localStorage.getItem('edlingo_sync_queue');
      this.syncQueue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  saveSyncQueue() {
    try {
      localStorage.setItem('edlingo_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  addToSyncQueue(operation) {
    const syncItem = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      operation,
      retries: 0
    };
    
    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
    
    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      this.syncPendingData();
    }
  }

  // Periodic sync
  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingData();
      }
    }, this.config.syncInterval);
  }

  // Main sync function
  async syncPendingData() {
    if (this.syncInProgress || !this.isOnline || !AppConfig.isDatabaseEnabled()) {
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting data synchronization...');

    try {
      // Test connection first
      const connectionTest = await supabaseService.testConnection();
      if (!connectionTest.connected) {
        throw new Error('Database connection failed');
      }

      // Process sync queue
      const failedItems = [];
      
      for (const item of this.syncQueue) {
        try {
          await this.processSyncItem(item);
          console.log(`✅ Synced: ${item.operation.type}`);
        } catch (error) {
          console.error(`❌ Sync failed for ${item.operation.type}:`, error);
          
          item.retries++;
          if (item.retries < this.config.retryAttempts) {
            failedItems.push(item);
          } else {
            console.error(`🚫 Giving up on sync item after ${this.config.retryAttempts} retries:`, item);
          }
        }
      }

      // Update sync queue with failed items
      this.syncQueue = failedItems;
      this.saveSyncQueue();
      
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('edlingo_last_sync', this.lastSyncTime);
      
      console.log('✅ Data synchronization completed');
      
    } catch (error) {
      console.error('❌ Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async processSyncItem(item) {
    const { operation } = item;
    
    switch (operation.type) {
      case 'save_progress':
        return await supabaseService.saveUserProgress(operation.userId, operation.data);
      
      case 'save_vocabulary':
        return await supabaseService.saveVocabulary(operation.userId, operation.data);
      
      case 'save_session':
        return await supabaseService.saveLearningSession(operation.userId, operation.data);
      
      default:
        throw new Error(`Unknown sync operation: ${operation.type}`);
    }
  }

  // Public API methods
  async saveUserProgress(userId, progressData) {
    if (this.isOnline && AppConfig.isDatabaseEnabled()) {
      try {
        const result = await supabaseService.saveUserProgress(userId, progressData);
        if (result.success) {
          // Also save to localStorage as backup
          this.saveToLocalStorage('user_progress', userId, progressData);
          return result;
        }
      } catch (error) {
        console.error('Failed to save progress online:', error);
      }
    }
    
    // Fallback to offline mode
    this.saveToLocalStorage('user_progress', userId, progressData);
    this.addToSyncQueue({
      type: 'save_progress',
      userId,
      data: progressData
    });
    
    return { success: true, offline: true };
  }

  async saveVocabulary(userId, vocabularyData) {
    if (this.isOnline && AppConfig.isDatabaseEnabled()) {
      try {
        const result = await supabaseService.saveVocabulary(userId, vocabularyData);
        if (result.success) {
          this.saveToLocalStorage('vocabulary', userId, vocabularyData);
          return result;
        }
      } catch (error) {
        console.error('Failed to save vocabulary online:', error);
      }
    }
    
    this.saveToLocalStorage('vocabulary', userId, vocabularyData);
    this.addToSyncQueue({
      type: 'save_vocabulary',
      userId,
      data: vocabularyData
    });
    
    return { success: true, offline: true };
  }

  async saveLearningSession(userId, sessionData) {
    if (this.isOnline && AppConfig.isDatabaseEnabled()) {
      try {
        const result = await supabaseService.saveLearningSession(userId, sessionData);
        if (result.success) {
          this.saveToLocalStorage('sessions', userId, sessionData);
          return result;
        }
      } catch (error) {
        console.error('Failed to save session online:', error);
      }
    }
    
    this.saveToLocalStorage('sessions', userId, sessionData);
    this.addToSyncQueue({
      type: 'save_session',
      userId,
      data: sessionData
    });
    
    return { success: true, offline: true };
  }

  // Local storage helpers
  saveToLocalStorage(type, userId, data) {
    try {
      const key = `edlingo_${type}_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (Array.isArray(existing)) {
        existing.push({ ...data, timestamp: new Date().toISOString() });
      } else {
        // For single items like progress
        localStorage.setItem(key, JSON.stringify({ ...data, timestamp: new Date().toISOString() }));
        return;
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  getFromLocalStorage(type, userId) {
    try {
      const key = `edlingo_${type}_${userId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get from localStorage:', error);
      return null;
    }
  }

  // Status methods
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingItems: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      databaseEnabled: AppConfig.isDatabaseEnabled()
    };
  }

  // Force sync
  async forcSync() {
    if (this.isOnline) {
      await this.syncPendingData();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }
}

// Create and export singleton instance
const databaseSyncService = new DatabaseSyncService();
export default databaseSyncService;

export const getOrCreateUserProfileId = async (supabase) => {
  console.log('🔎 [DBSync] Resolving user profile id...');
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    console.warn('⚠️ [DBSync] getUser error:', authErr);
  }
  if (!user) {
    console.log('ℹ️ [DBSync] No authenticated user');
    return null;
  }

  const { data: rows, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.warn('⚠️ [DBSync] user_profiles lookup error:', error?.message || error);
  }

  const profile = Array.isArray(rows) ? rows[0] : rows;
  if (profile?.id) {
    console.log('✅ [DBSync] Found profile id:', profile.id);
    return profile.id;
  }

  console.log('➕ [DBSync] Creating profile for user:', user.id);
  const { data: createdRows, error: createErr } = await supabase
    .from('user_profiles')
    .insert([{ user_id: user.id, email: user.email || null }])
    .select('id');
  if (createErr) {
    console.warn('⚠️ [DBSync] Failed to create profile:', createErr?.message || createErr);
    return null;
  }
  const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;
  console.log('✅ [DBSync] Created profile id:', created?.id);
  return created?.id ?? null;
};