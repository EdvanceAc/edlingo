/**
 * Custom hook for progress tracking
 * Provides easy-to-use methods for tracking user activities
 */

import { useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { progressTracker } from '../services/ProgressTracker';
import toast from 'react-hot-toast';

export function useProgressTracking() {
  const { user } = useAuth();
  const sessionStartRef = useRef(null);

  /**
   * Track lesson completion
   */
  const trackLessonCompleted = useCallback(async (lessonData) => {
    if (!user?.id) return;

    try {
      const result = await progressTracker.trackLessonCompleted(user.id, lessonData);
      if (result?.message) {
        toast.success(result.message, {
          icon: '🎓',
          duration: 3000,
        });
      }
      return result;
    } catch (error) {
      console.error('Error tracking lesson:', error);
    }
  }, [user?.id]);

  /**
   * Track AI chat message
   */
  const trackChatMessage = useCallback(async (messageData = {}) => {
    if (!user?.id) return;

    try {
      const result = await progressTracker.trackChatMessage(user.id, messageData);
      return result;
    } catch (error) {
      console.error('Error tracking chat message:', error);
    }
  }, [user?.id]);

  /**
   * Track AI chat session
   */
  const trackChatSession = useCallback(async (sessionData) => {
    if (!user?.id) return;

    try {
      const result = await progressTracker.trackChatSession(user.id, sessionData);
      if (result?.message) {
        toast.success(result.message, {
          icon: '💬',
          duration: 3000,
        });
      }
      return result;
    } catch (error) {
      console.error('Error tracking chat session:', error);
    }
  }, [user?.id]);

  /**
   * Start tracking live conversation
   */
  const startLiveConversation = useCallback(async (conversationId) => {
    if (!user?.id) return;

    sessionStartRef.current = Date.now();

    try {
      const result = await progressTracker.trackLiveConversationStart(user.id, {
        conversationId
      });
      
      if (result?.message) {
        toast.success(result.message, {
          icon: '🎤',
          duration: 2000,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error starting live conversation tracking:', error);
    }
  }, [user?.id]);

  /**
   * End tracking live conversation
   */
  const endLiveConversation = useCallback(async (conversationData) => {
    if (!user?.id) return;

    const duration = sessionStartRef.current 
      ? Math.round((Date.now() - sessionStartRef.current) / 60000) // Convert to minutes
      : conversationData.duration || 0;

    try {
      const result = await progressTracker.trackLiveConversationCompleted(user.id, {
        ...conversationData,
        duration
      });

      if (result?.message) {
        toast.success(result.message, {
          icon: '🎉',
          duration: 4000,
        });
      }

      sessionStartRef.current = null;
      return result;
    } catch (error) {
      console.error('Error ending live conversation tracking:', error);
    }
  }, [user?.id]);

  /**
   * Track quiz completion
   */
  const trackQuizCompleted = useCallback(async (quizData) => {
    if (!user?.id) return;

    try {
      const result = await progressTracker.trackQuizCompleted(user.id, quizData);
      if (result?.message) {
        toast.success(result.message, {
          icon: '📝',
          duration: 3000,
        });
      }
      return result;
    } catch (error) {
      console.error('Error tracking quiz:', error);
    }
  }, [user?.id]);

  /**
   * Get current session duration (for live conversations)
   */
  const getCurrentSessionDuration = useCallback(() => {
    if (!sessionStartRef.current) return 0;
    return Math.round((Date.now() - sessionStartRef.current) / 60000); // Minutes
  }, []);

  return {
    trackLessonCompleted,
    trackChatMessage,
    trackChatSession,
    startLiveConversation,
    endLiveConversation,
    trackQuizCompleted,
    getCurrentSessionDuration,
  };
}
