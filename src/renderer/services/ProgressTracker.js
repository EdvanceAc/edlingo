/**
 * Progress Tracker Service
 * Tracks user activities and awards XP/progress automatically
 */

import { supabase } from '../config/supabaseConfig';

// XP Rewards Configuration
const XP_REWARDS = {
  // Course activities
  LESSON_COMPLETED: 50,
  LESSON_PERFECT_SCORE: 100, // Bonus for 100% score
  COURSE_COMPLETED: 500,
  QUIZ_PASSED: 30,
  QUIZ_PERFECT: 75,
  
  // AI Chat activities
  CHAT_MESSAGE_SENT: 5,
  CHAT_SESSION_5MIN: 20,
  CHAT_SESSION_10MIN: 40,
  CHAT_SESSION_30MIN: 100,
  
  // Live Conversation activities
  LIVE_CONVERSATION_START: 25,
  LIVE_CONVERSATION_5MIN: 50,
  LIVE_CONVERSATION_10MIN: 100,
  LIVE_CONVERSATION_30MIN: 250,
  LIVE_CONVERSATION_COMPLETED: 150,
  
  // Bonus achievements
  DAILY_GOAL_MET: 50,
  WEEK_STREAK: 100,
  MONTH_STREAK: 500,
};

// Activity duration thresholds (in minutes)
const DURATION_THRESHOLDS = {
  SHORT: 5,
  MEDIUM: 10,
  LONG: 30,
};

class ProgressTracker {
  constructor() {
    this.sessionStartTime = null;
    this.currentActivity = null;
  }

  /**
   * Track lesson completion
   */
  async trackLessonCompleted(userId, lessonData) {
    const { 
      lessonId, 
      courseId, 
      score = 0, 
      duration = 0,
      wordsLearned = 0 
    } = lessonData;

    let xpEarned = XP_REWARDS.LESSON_COMPLETED;
    
    // Bonus for perfect score
    if (score >= 100) {
      xpEarned += XP_REWARDS.LESSON_PERFECT_SCORE;
    }

    await this.updateProgress(userId, {
      xp: xpEarned,
      lessons_completed: 1,
      daily_progress: duration,
      activity_type: 'lesson_completed',
      activity_data: { lessonId, courseId, score }
    });

    // Update course enrollment progress
    if (courseId) {
      await this.updateCourseProgress(userId, courseId);
    }

    return { xpEarned, message: `Lesson completed! +${xpEarned} XP` };
  }

  /**
   * Track AI chat activity
   */
  async trackChatMessage(userId, messageData) {
    const { sessionId, messageCount = 1 } = messageData;
    
    let xpEarned = XP_REWARDS.CHAT_MESSAGE_SENT * messageCount;

    await this.updateProgress(userId, {
      xp: xpEarned,
      chat_messages: messageCount,
      daily_progress: 1, // 1 minute per message
      activity_type: 'chat_message',
      activity_data: { sessionId }
    });

    return { xpEarned };
  }

  /**
   * Track AI chat session completion
   */
  async trackChatSession(userId, sessionData) {
    const { sessionId, duration, messageCount = 0 } = sessionData;
    
    let xpEarned = 0;
    
    // Award XP based on session duration
    if (duration >= DURATION_THRESHOLDS.LONG) {
      xpEarned = XP_REWARDS.CHAT_SESSION_30MIN;
    } else if (duration >= DURATION_THRESHOLDS.MEDIUM) {
      xpEarned = XP_REWARDS.CHAT_SESSION_10MIN;
    } else if (duration >= DURATION_THRESHOLDS.SHORT) {
      xpEarned = XP_REWARDS.CHAT_SESSION_5MIN;
    }

    await this.updateProgress(userId, {
      xp: xpEarned,
      chat_messages: messageCount,
      daily_progress: duration,
      activity_type: 'chat_session',
      activity_data: { sessionId, duration }
    });

    return { xpEarned, message: `Chat session completed! +${xpEarned} XP` };
  }

  /**
   * Track live conversation start
   */
  async trackLiveConversationStart(userId, conversationData) {
    const { conversationId } = conversationData;
    
    this.sessionStartTime = Date.now();
    this.currentActivity = { type: 'live_conversation', id: conversationId };

    const xpEarned = XP_REWARDS.LIVE_CONVERSATION_START;

    await this.updateProgress(userId, {
      xp: xpEarned,
      activity_type: 'live_conversation_start',
      activity_data: { conversationId }
    });

    return { xpEarned, message: `Live conversation started! +${xpEarned} XP` };
  }

  /**
   * Track live conversation completion
   */
  async trackLiveConversationCompleted(userId, conversationData) {
    const { 
      conversationId, 
      duration = 0, 
      messageCount = 0,
      pronunciationScore = 0 
    } = conversationData;

    let xpEarned = XP_REWARDS.LIVE_CONVERSATION_COMPLETED;
    
    // Award XP based on duration
    if (duration >= DURATION_THRESHOLDS.LONG) {
      xpEarned += XP_REWARDS.LIVE_CONVERSATION_30MIN;
    } else if (duration >= DURATION_THRESHOLDS.MEDIUM) {
      xpEarned += XP_REWARDS.LIVE_CONVERSATION_10MIN;
    } else if (duration >= DURATION_THRESHOLDS.SHORT) {
      xpEarned += XP_REWARDS.LIVE_CONVERSATION_5MIN;
    }

    await this.updateProgress(userId, {
      xp: xpEarned,
      daily_progress: duration,
      pronunciation_accuracy: pronunciationScore,
      activity_type: 'live_conversation_completed',
      activity_data: { conversationId, duration, messageCount }
    });

    this.sessionStartTime = null;
    this.currentActivity = null;

    return { xpEarned, message: `Live conversation completed! +${xpEarned} XP` };
  }

  /**
   * Track quiz completion
   */
  async trackQuizCompleted(userId, quizData) {
    const { quizId, score = 0, duration = 0 } = quizData;
    
    let xpEarned = XP_REWARDS.QUIZ_PASSED;
    
    if (score >= 100) {
      xpEarned = XP_REWARDS.QUIZ_PERFECT;
    }

    await this.updateProgress(userId, {
      xp: xpEarned,
      daily_progress: duration,
      activity_type: 'quiz_completed',
      activity_data: { quizId, score }
    });

    return { xpEarned, message: `Quiz completed! +${xpEarned} XP` };
  }

  /**
   * Core method to update user progress
   */
  async updateProgress(userId, updates) {
    try {
      // Get current progress
      const { data: currentProgress, error: fetchError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching progress:', fetchError);
        return;
      }

      // Calculate new values
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastStudyDate = currentProgress?.last_study_date;
      
      // Update streak
      let newStreak = currentProgress?.daily_streak || 0;
      if (lastStudyDate !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastStudyDate === yesterdayStr) {
          newStreak += 1; // Continue streak
        } else if (lastStudyDate !== today) {
          newStreak = 1; // Reset streak
        }
      }

      // Calculate new totals
      const newTotalXP = (currentProgress?.total_xp || 0) + (updates.xp || 0);
      const newLevel = this.calculateLevel(newTotalXP);
      const newLessonsCompleted = (currentProgress?.lessons_completed || 0) + (updates.lessons_completed || 0);
      const newChatMessages = (currentProgress?.chat_messages || 0) + (updates.chat_messages || 0);
      const newDailyProgress = lastStudyDate === today 
        ? (currentProgress?.daily_progress || 0) + (updates.daily_progress || 0)
        : (updates.daily_progress || 0);

      // Update pronunciation accuracy (weighted average)
      let newPronunciationAccuracy = currentProgress?.pronunciation_accuracy || 0;
      if (updates.pronunciation_accuracy) {
        const oldWeight = currentProgress?.lessons_completed || 1;
        const newWeight = oldWeight + 1;
        newPronunciationAccuracy = (
          (newPronunciationAccuracy * oldWeight + updates.pronunciation_accuracy) / newWeight
        );
      }

      // Prepare update data
      const updateData = {
        user_id: userId,
        language: currentProgress?.language || 'en',
        total_xp: newTotalXP,
        current_level: newLevel.toString(),
        daily_streak: newStreak,
        daily_progress: Math.round(newDailyProgress),
        lessons_completed: newLessonsCompleted,
        chat_messages: newChatMessages,
        pronunciation_accuracy: Math.round(newPronunciationAccuracy * 100) / 100,
        last_study_date: today,
        updated_at: now.toISOString()
      };

      // Upsert progress
      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(updateData, {
          onConflict: 'user_id,language'
        });

      if (upsertError) {
        console.error('Error updating progress:', upsertError);
        return;
      }

      // Log activity
      await this.logActivity(userId, updates.activity_type, updates.activity_data);

      // Check for achievements
      await this.checkAchievements(userId, {
        totalXP: newTotalXP,
        streak: newStreak,
        dailyProgress: newDailyProgress,
        lessonsCompleted: newLessonsCompleted
      });

      console.log('✅ Progress updated:', { newTotalXP, newLevel, newStreak });
      
    } catch (error) {
      console.error('Error in updateProgress:', error);
    }
  }

  /**
   * Calculate level from XP
   */
  calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  /**
   * Update course enrollment progress
   */
  async updateCourseProgress(userId, courseId) {
    try {
      // Get total lessons in course
      const { data: course } = await supabase
        .from('courses')
        .select('duration_weeks')
        .eq('id', courseId)
        .single();

      const totalLessons = course?.duration_weeks || 10;

      // Get user's completed lessons for this course
      const { data: enrollment } = await supabase
        .from('user_course_enrollments')
        .select('lessons_completed, progress_percentage')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      const lessonsCompleted = (enrollment?.lessons_completed || 0) + 1;
      const progressPercentage = (lessonsCompleted / totalLessons) * 100;
      const isCompleted = progressPercentage >= 100;

      // Update enrollment
      await supabase
        .from('user_course_enrollments')
        .upsert({
          user_id: userId,
          course_id: courseId,
          lessons_completed: lessonsCompleted,
          progress_percentage: Math.min(progressPercentage, 100),
          status: isCompleted ? 'completed' : 'in_progress',
          last_accessed_at: new Date().toISOString(),
          ...(isCompleted && { completed_at: new Date().toISOString() })
        }, {
          onConflict: 'user_id,course_id'
        });

      // Award bonus XP for course completion
      if (isCompleted && !enrollment?.completed_at) {
        await this.updateProgress(userId, {
          xp: XP_REWARDS.COURSE_COMPLETED,
          activity_type: 'course_completed',
          activity_data: { courseId }
        });
      }

    } catch (error) {
      console.error('Error updating course progress:', error);
    }
  }

  /**
   * Log user activity
   */
  async logActivity(userId, activityType, activityData) {
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          activity_data: activityData,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // Activity logging is non-critical, just log the error
      console.warn('Activity logging failed:', error);
    }
  }

  /**
   * Check and award achievements
   */
  async checkAchievements(userId, stats) {
    const achievements = [];

    // Streak achievements
    if (stats.streak === 3) achievements.push('streak_3');
    if (stats.streak === 7) achievements.push('streak_7');
    if (stats.streak === 30) achievements.push('streak_30');

    // Lesson achievements
    if (stats.lessonsCompleted === 1) achievements.push('first_lesson');
    if (stats.lessonsCompleted === 10) achievements.push('lessons_10');
    if (stats.lessonsCompleted === 50) achievements.push('lessons_50');

    // Daily goal achievement
    if (stats.dailyProgress >= 30) achievements.push('daily_goal_met');

    if (achievements.length > 0) {
      // Get current achievements
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('achievements')
        .eq('user_id', userId)
        .single();

      const currentAchievements = currentProgress?.achievements || [];
      const newAchievements = achievements.filter(a => !currentAchievements.includes(a));

      if (newAchievements.length > 0) {
        await supabase
          .from('user_progress')
          .update({
            achievements: [...currentAchievements, ...newAchievements]
          })
          .eq('user_id', userId);

        // Award bonus XP for achievements
        const achievementXP = newAchievements.length * 50;
        await this.updateProgress(userId, {
          xp: achievementXP,
          activity_type: 'achievement_unlocked',
          activity_data: { achievements: newAchievements }
        });
      }
    }
  }
}

// Export singleton instance
export const progressTracker = new ProgressTracker();
export { XP_REWARDS, DURATION_THRESHOLDS };
