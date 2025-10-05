// useProgression Hook for EdLingo
// Custom React hook for managing user progression state and content delivery

import { useState, useEffect, useCallback, useRef } from 'react';
import progressionService from '../services/progressionService';
import conversationEngagementService from '../services/conversationEngagementService';
import { useAuth } from '../renderer/contexts/AuthContext';
import { useToast } from '../renderer/hooks/use-toast';

/**
 * Custom hook for managing user progression and content delivery
 * @param {Object} options - Hook options
 * @returns {Object} Progression state and methods
 */
export const useProgression = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    language = 'spanish',
    cefrLevel = 'A1'
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  const refreshIntervalRef = useRef(null);

  // State
  const [modules, setModules] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [conversationRequirements, setConversationRequirements] = useState(null);
  const [learningPaths, setLearningPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load user profile to get language and level preferences
  const loadUserProfile = useCallback(async () => {
    if (!user?.id) return { language: 'spanish', cefrLevel: 'A1' };
    
    try {
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (response.ok) {
        const profile = await response.json();
        return {
          language: profile.target_language || language,
          cefrLevel: profile.placement_level || cefrLevel
        };
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
    
    return { language, cefrLevel };
  }, [user?.id, language, cefrLevel]);

  // Load progression data
  const loadProgressionData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    // Avoid duplicate requests
    if (loading && !forceRefresh) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get user preferences
      const { language: userLanguage, cefrLevel: userLevel } = await loadUserProfile();
      
      // Load available modules
      const availableModules = await progressionService.getAvailableModules(
        user.id,
        userLanguage,
        userLevel
      );
      
      // Load user progress
      const progress = await progressionService.getUserProgress(user.id);
      
      // Check conversation requirements
      const convReqs = await conversationEngagementService.checkConversationRequirements(
        user.id,
        {
          minTotalTurns: 50,
          minEngagementScore: 70,
          minSessionCount: 5,
          timeframeDays: 30
        }
      );
      
      // Update state
      setModules(availableModules);
      setUserProgress(progress);
      setConversationRequirements(convReqs);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Failed to load progression data:', err);
      setError(err.message || 'Failed to load progression data');
      
      toast({
        title: "Error",
        description: "Failed to load learning progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUserProfile, toast, loading]);

  // Initialize user progression for a learning path
  const initializeProgression = useCallback(async (learningPathId) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      setLoading(true);
      
      const result = await progressionService.initializeUserProgression(
        user.id,
        learningPathId
      );
      
      // Refresh data after initialization
      await loadProgressionData(true);
      
      toast({
        title: "Success",
        description: `Enrolled in learning path with ${result.modulesInitialized} modules.`,
        variant: "default"
      });
      
      return result;
      
    } catch (err) {
      console.error('Failed to initialize progression:', err);
      setError(err.message || 'Failed to initialize progression');
      
      toast({
        title: "Error",
        description: "Failed to enroll in learning path. Please try again.",
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadProgressionData, toast]);

  // Start a module
  const startModule = useCallback(async (moduleId) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      await progressionService.updateModuleProgress(user.id, moduleId, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
        attempts: 1
      });
      
      // Update local state
      setModules(prevModules => 
        prevModules.map(module => 
          module.id === moduleId 
            ? { ...module, status: 'in_progress', attempts: 1 }
            : module
        )
      );
      
      toast({
        title: "Module Started",
        description: "You can now begin learning!",
        variant: "default"
      });
      
    } catch (err) {
      console.error('Failed to start module:', err);
      setError(err.message || 'Failed to start module');
      
      toast({
        title: "Error",
        description: "Failed to start module. Please try again.",
        variant: "destructive"
      });
      
      throw err;
    }
  }, [user?.id, toast]);

  // Update module progress
  const updateModuleProgress = useCallback(async (moduleId, progressData) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      await progressionService.updateModuleProgress(user.id, moduleId, progressData);
      
      // Update local state
      setModules(prevModules => 
        prevModules.map(module => 
          module.id === moduleId 
            ? { ...module, ...progressData }
            : module
        )
      );
      
      // If module completed, refresh to check for newly unlocked content
      if (progressData.status === 'completed') {
        setTimeout(() => loadProgressionData(true), 1000);
        
        toast({
          title: "Module Completed!",
          description: "Great job! New content may now be available.",
          variant: "default"
        });
      }
      
    } catch (err) {
      console.error('Failed to update module progress:', err);
      setError(err.message || 'Failed to update progress');
      
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive"
      });
      
      throw err;
    }
  }, [user?.id, loadProgressionData, toast]);

  // Start conversation session
  const startConversationSession = useCallback(async (sessionType, language, topic) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const session = await conversationEngagementService.startConversationSession(
        user.id,
        sessionType,
        language,
        topic
      );
      
      return session;
      
    } catch (err) {
      console.error('Failed to start conversation session:', err);
      setError(err.message || 'Failed to start conversation');
      
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
      
      throw err;
    }
  }, [user?.id, toast]);

  // Record conversation turn
  const recordConversationTurn = useCallback(async (sessionId, turnData) => {
    try {
      const result = await conversationEngagementService.recordConversationTurn(
        sessionId,
        turnData
      );
      
      return result;
      
    } catch (err) {
      console.error('Failed to record conversation turn:', err);
      // Don't show toast for turn recording errors as they happen frequently
      throw err;
    }
  }, []);

  // End conversation session
  const endConversationSession = useCallback(async (sessionId) => {
    try {
      const result = await conversationEngagementService.endConversationSession(sessionId);
      
      // Refresh conversation requirements after session ends
      setTimeout(() => loadProgressionData(true), 1000);
      
      if (result.meetsEngagementRequirements) {
        toast({
          title: "Great Conversation!",
          description: "Your engagement level meets progression requirements.",
          variant: "default"
        });
      }
      
      return result;
      
    } catch (err) {
      console.error('Failed to end conversation session:', err);
      setError(err.message || 'Failed to end conversation');
      
      toast({
        title: "Error",
        description: "Failed to save conversation data. Please try again.",
        variant: "destructive"
      });
      
      throw err;
    }
  }, [loadProgressionData, toast]);

  // Get module by ID
  const getModule = useCallback((moduleId) => {
    return modules.find(module => module.id === moduleId);
  }, [modules]);

  // Get modules by status
  const getModulesByStatus = useCallback((status) => {
    return modules.filter(module => module.status === status);
  }, [modules]);

  // Check if user can access module
  const canAccessModule = useCallback((moduleId) => {
    const module = getModule(moduleId);
    return module && ['available', 'in_progress', 'completed'].includes(module.status);
  }, [getModule]);

  // Get overall progress statistics
  const getProgressStats = useCallback(() => {
    const total = modules.length;
    const completed = modules.filter(m => m.status === 'completed').length;
    const inProgress = modules.filter(m => m.status === 'in_progress').length;
    const available = modules.filter(m => m.status === 'available').length;
    const locked = modules.filter(m => m.status === 'locked').length;
    
    return {
      total,
      completed,
      inProgress,
      available,
      locked,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [modules]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    return loadProgressionData(true);
  }, [loadProgressionData]);

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        loadProgressionData();
      }, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, loadProgressionData]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      loadProgressionData();
    }
  }, [user?.id, loadProgressionData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    modules,
    userProgress,
    conversationRequirements,
    learningPaths,
    currentPath,
    loading,
    error,
    lastRefresh,
    
    // Methods
    initializeProgression,
    startModule,
    updateModuleProgress,
    startConversationSession,
    recordConversationTurn,
    endConversationSession,
    
    // Utilities
    getModule,
    getModulesByStatus,
    canAccessModule,
    getProgressStats,
    
    // Actions
    refresh,
    clearError
  };
};

export default useProgression;