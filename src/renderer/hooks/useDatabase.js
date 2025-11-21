import { useState, useEffect, useCallback } from 'react';
import supabaseService from '../services/supabaseService.js';
import databaseSyncService from '../services/databaseSyncService.js';
import { AppConfig } from '../../config/AppConfig.js';

/**
 * Custom hook for database operations
 * Provides easy access to Supabase and sync functionality
 */
export const useDatabase = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check connection
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setLoading(true);
        
        // Check if database is enabled
        if (!AppConfig.isDatabaseEnabled()) {
          console.warn('Database is not enabled. Check your environment variables.');
          setLoading(false);
          return;
        }

        // Test connection
        const connectionStatus = await supabaseService.testConnection();
        setIsConnected(connectionStatus.connected);
        
        // Get current user
        const userResult = await supabaseService.getCurrentUser();
        if (userResult.success) {
          setUser(userResult.user);
        }
        
        // Get sync status
        setSyncStatus(databaseSyncService.getSyncStatus());
        
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDatabase();

    // Update sync status periodically
    const statusInterval = setInterval(() => {
      setSyncStatus(databaseSyncService.getSyncStatus());
    }, 5000);

    return () => clearInterval(statusInterval);
  }, []);

  // Authentication methods
  const signUp = useCallback(async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const result = await supabaseService.signUp(email, password, userData);
      
      if (result.success) {
        setUser(result.data.user);
      }
      
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const result = await supabaseService.signIn(email, password);
      
      if (result.success) {
        setUser(result.data.user);
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const result = await supabaseService.signOut();
      
      if (result.success) {
        setUser(null);
      }
      
      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Data management methods
  const saveProgress = useCallback(async (progressData) => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    return await databaseSyncService.saveUserProgress(user.id, progressData);
  }, [user]);

  const getProgress = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    if (isConnected) {
      return await supabaseService.getUserProgress(user.id);
    } else {
      // Fallback to local storage
      const localData = databaseSyncService.getFromLocalStorage('user_progress', user.id);
      return { success: true, data: localData };
    }
  }, [user, isConnected]);

  const saveVocabulary = useCallback(async (vocabularyData) => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    return await databaseSyncService.saveVocabulary(user.id, vocabularyData);
  }, [user]);

  const getVocabulary = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    if (isConnected) {
      return await supabaseService.getUserVocabulary(user.id);
    } else {
      const localData = databaseSyncService.getFromLocalStorage('vocabulary', user.id);
      return { success: true, data: localData || [] };
    }
  }, [user, isConnected]);

  const saveLearningSession = useCallback(async (sessionData) => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    return await databaseSyncService.saveLearningSession(user.id, sessionData);
  }, [user]);

  const getLearningHistory = useCallback(async (limit = 10) => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    if (isConnected) {
      return await supabaseService.getUserSessions(user.id, limit);
    } else {
      const localData = databaseSyncService.getFromLocalStorage('sessions', user.id);
      const sessions = Array.isArray(localData) ? localData.slice(-limit) : [];
      return { success: true, data: sessions };
    }
  }, [user, isConnected]);

  // Sync methods
  const forceSync = useCallback(async () => {
    try {
      await databaseSyncService.forcSync();
      setSyncStatus(databaseSyncService.getSyncStatus());
      return { success: true };
    } catch (error) {
      console.error('Force sync failed:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const syncData = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    
    return await supabaseService.syncData();
  }, [user]);

  // Real-time subscriptions
  const subscribeToProgress = useCallback((callback) => {
    if (!user || !isConnected) {
      return null;
    }
    
    return supabaseService.subscribeToUserProgress(user.id, callback);
  }, [user, isConnected]);

  return {
    // Connection status
    isConnected,
    loading,
    syncStatus,
    user,
    isAuthenticated: !!user,
    isDatabaseEnabled: AppConfig.isDatabaseEnabled(),
    
    // Authentication
    signUp,
    signIn,
    signOut,
    
    // Data operations
    saveProgress,
    getProgress,
    saveVocabulary,
    getVocabulary,
    saveLearningSession,
    getLearningHistory,
    
    // Sync operations
    forceSync,
    syncData,
    
    // Real-time
    subscribeToProgress
  };
};

// Hook for database status only (lighter version)
export const useDatabaseStatus = () => {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    const updateStatus = () => {
      setStatus(databaseSyncService.getSyncStatus());
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return status;
};

export default useDatabase;