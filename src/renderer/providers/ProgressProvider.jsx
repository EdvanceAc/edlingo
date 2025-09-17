import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, checkSupabaseConnection } from '../config/supabaseConfig.js';

const ProgressContext = createContext({
  userProgress: {},
  dailyGoal: 30,
  streak: 0,
  totalXP: 0,
  level: 1,
  achievements: [],
  updateProgress: () => {},
  addXP: () => {},
  completeLesson: () => {},
  setDailyGoal: () => {},
  getProgressStats: () => {},
});

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

const INITIAL_PROGRESS = {
  totalXP: 0,
  level: 1,
  streak: 0,
  daily_goal: 30, // minutes
  daily_progress: 0,
  lastStudyDate: null,
  total_lessons_completed: 0,
  wordsLearned: 0,
  pronunciationAccuracy: 0,
  chat_messages: 0,
  achievements: [],
  language: 'en', // Default language to prevent NOT NULL constraint violation
  weeklyStats: {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  },
  subjects: {
    vocabulary: { xp: 0, level: 1, progress: 0 },
    grammar: { xp: 0, level: 1, progress: 0 },
    pronunciation: { xp: 0, level: 1, progress: 0 },
    conversation: { xp: 0, level: 1, progress: 0 },
  }
};

const ACHIEVEMENTS = [
  { id: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', xp: 50, icon: '🎯' },
  { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day streak', xp: 100, icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', xp: 200, icon: '⚡' },
  { id: 'streak_30', name: 'Month Master', description: 'Maintain a 30-day streak', xp: 500, icon: '👑' },
  { id: 'words_100', name: 'Word Collector', description: 'Learn 100 new words', xp: 150, icon: '📚' },
  { id: 'words_500', name: 'Vocabulary Expert', description: 'Learn 500 new words', xp: 300, icon: '🧠' },
  { id: 'pronunciation_master', name: 'Perfect Pronunciation', description: 'Achieve 95% accuracy in pronunciation', xp: 250, icon: '🎤' },
  { id: 'chat_enthusiast', name: 'Chat Enthusiast', description: 'Send 100 chat messages', xp: 100, icon: '💬' },
  { id: 'level_10', name: 'Rising Star', description: 'Reach level 10', xp: 300, icon: '⭐' },
  { id: 'level_25', name: 'Language Learner', description: 'Reach level 25', xp: 500, icon: '🌟' },
  { id: 'daily_goal_week', name: 'Consistent Learner', description: 'Meet daily goal for 7 days', xp: 200, icon: '📈' },
];

export function ProgressProvider({ children }) {
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState(INITIAL_PROGRESS);

  // Fetch progress from Supabase
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.id) return;
      try {
         const { connected } = await checkSupabaseConnection();
         if (!connected) {
         console.warn('Supabase not connected. Skipping remote progress fetch.');
         return;
         }
         const { data, error } = await supabase
           .from('user_progress')
           .select('user_id,total_xp,current_level,daily_streak,daily_goal,daily_progress,last_study_date,lessons_completed,pronunciation_accuracy,chat_messages,achievements,language,created_at,updated_at')
           .eq('user_id', user.id)
           .order('updated_at', { ascending: false })
           .limit(1);
        
        if (error) throw error;
        if (Array.isArray(data) && data.length > 0) {
          setUserProgress(prev => ({ ...prev, ...mapToJS(data[0]) }));
        } else {
          // Get user's preferred language from profile
          let userLanguage = 'en'; // Default fallback
          try {
            const { data: profileRows } = await supabase
              .from('user_profiles')
              .select('preferred_language')
              .eq('user_id', user.id)
              .limit(1);
            if (Array.isArray(profileRows) && profileRows[0]?.preferred_language) {
              userLanguage = profileRows[0].preferred_language;
            }
          } catch (profileError) {
            console.warn('Could not fetch user language preference, using default:', profileError);
          }
          
          // Create initial progress if not exists
          const initialData = { 
            ...INITIAL_PROGRESS, 
            user_id: user.id,
            language: userLanguage
          };
          const dbData = mapToDB(initialData);
          const { error: upsertError } = await supabase
            .from('user_progress')
            .upsert(dbData);
          if (upsertError) throw upsertError;
          setUserProgress(initialData);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
        // Handle RLS policy violations and other database errors gracefully
        if (error.code === '42501' || error.code === 'PGRST204') {
          console.warn('Database access restricted, using local fallback progress data');
          setUserProgress(INITIAL_PROGRESS);
        } else if (error.code === '23502' && error.message?.includes('language')) {
          console.error('Language field is required but missing. This indicates a database schema issue.');
          // Try to create progress with explicit language field
          try {
            const fallbackData = { 
              ...INITIAL_PROGRESS, 
              user_id: user.id,
              language: 'en' // Explicit fallback
            };
            const dbData = mapToDB(fallbackData);
            const { error: retryError } = await supabase
              .from('user_progress')
              .upsert(dbData);
            if (!retryError) {
              setUserProgress(fallbackData);
              return;
            }
          } catch (retryError) {
            console.error('Retry with explicit language also failed:', retryError);
          }
          setUserProgress(INITIAL_PROGRESS);
        }
      }
    };

    fetchProgress();
  }, [user?.id]);

  // Polling-based progress updates (replaces realtime to avoid Cloudflare websocket issues)
  useEffect(() => {
    if (!user?.id) return;
    
    // Poll for progress updates every 30 seconds instead of using realtime
    let pollInterval;
    (async () => {
      const { connected } = await checkSupabaseConnection();
      if (!connected) return;
      
      pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('user_progress')
            .select('user_id,total_xp,current_level,daily_streak,daily_goal,daily_progress,last_study_date,lessons_completed,pronunciation_accuracy,chat_messages,achievements,language,created_at,updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1);
          
          if (Array.isArray(data) && data.length > 0 && !error) {
            setUserProgress(prev => ({ ...prev, ...mapToJS(data[0]) }));
          }
        } catch (error) {
          console.warn('Progress polling error:', error);
        }
      }, 30000); // Poll every 30 seconds
    })();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user?.id]);

  // Remove local save effect
  // useEffect(() => { ... });

  // Load progress from storage on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const savedProgress = await window.electronAPI?.loadProgress?.();
        if (savedProgress) {
          setUserProgress(prev => ({ ...prev, ...savedProgress }));
        } else {
          // Fallback to localStorage
          const localProgress = localStorage.getItem('lingo-progress');
          if (localProgress) {
            setUserProgress(prev => ({ ...prev, ...JSON.parse(localProgress) }));
          }
        }
      } catch (error) {
        console.warn('Failed to load progress:', error);
        // Try localStorage as fallback
        const localProgress = localStorage.getItem('lingo-progress');
        if (localProgress) {
          setUserProgress(prev => ({ ...prev, ...JSON.parse(localProgress) }));
        }
      }
    };

    loadProgress();
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    const saveProgress = async () => {
      try {
        await window.electronAPI?.saveProgress?.(userProgress);
      } catch (error) {
        console.warn('Failed to save progress via Electron API:', error);
      }
      // Always save to localStorage as fallback
      localStorage.setItem('lingo-progress', JSON.stringify(userProgress));
    };

    saveProgress();
  }, [userProgress]);

  // Calculate level from XP
  const calculateLevel = useCallback((xp) => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }, []);

  // Calculate XP needed for next level
  const getXPForNextLevel = useCallback((level) => {
    return Math.pow(level, 2) * 100;
  }, []);

  // Update streak based on study activity
  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    const lastStudy = userProgress.lastStudyDate;
    
    if (!lastStudy) {
      return 1; // First day
    }
    
    const lastStudyDate = new Date(lastStudy);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - lastStudyDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return userProgress.streak + 1; // Continue streak
    } else if (diffDays === 0) {
      return userProgress.streak; // Same day
    } else {
      return 1; // Reset streak
    }
  }, [userProgress.lastStudyDate, userProgress.streak]);

  // Check for new achievements
  const checkAchievements = useCallback((newProgress) => {
    const newAchievements = [];
    
    // Ensure newProgress and achievements array exist
    if (!newProgress || typeof newProgress !== 'object') {
      return newAchievements;
    }
    
    // Ensure achievements is an array and handle null values
    const currentAchievements = Array.isArray(newProgress.achievements) ? newProgress.achievements : [];
    
    ACHIEVEMENTS.forEach(achievement => {
      if (currentAchievements && currentAchievements.includes && currentAchievements.includes(achievement.id)) return;
      
      let earned = false;
      
      switch (achievement.id) {
        case 'first_lesson':
          earned = newProgress.total_lessons_completed >= 1;
          break;
        case 'streak_3':
          earned = newProgress.streak >= 3;
          break;
        case 'streak_7':
          earned = newProgress.streak >= 7;
          break;
        case 'streak_30':
          earned = newProgress.streak >= 30;
          break;
        case 'words_100':
          earned = newProgress.wordsLearned >= 100;
          break;
        case 'words_500':
          earned = newProgress.wordsLearned >= 500;
          break;
        case 'pronunciation_master':
          earned = newProgress.pronunciationAccuracy >= 95;
          break;
        case 'chat_enthusiast':
          earned = newProgress.chat_messages >= 100;
          break;
        case 'level_10':
          earned = newProgress.level >= 10;
          break;
        case 'level_25':
          earned = newProgress.level >= 25;
          break;
        case 'daily_goal_week':
          // Check if daily goal was met for 7 consecutive days
          if (newProgress.weeklyStats && typeof newProgress.weeklyStats === 'object') {
            const weekValues = Object.values(newProgress.weeklyStats);
            const consecutiveDays = weekValues.reduce((count, minutes) => {
              return minutes >= (newProgress.daily_goal || 30) ? count + 1 : 0;
            }, 0);
            earned = consecutiveDays >= 7;
          }
          break;
      }
      
      if (earned) {
        newAchievements.push(achievement);
      }
    });
    
    return newAchievements;
  }, []);

  // Add XP and update level
  const addXP = useCallback(async (amount, subject = null) => {
    if (!user?.id) return;
    
    const updateProgressData = async (newProgress) => {
      // Save to Supabase with error handling
      try {
        await supabase.from('user_progress').upsert({
          user_id: user.id,
          ...mapToDB(newProgress)
        });
      } catch (error) {
        if (error.code === '42501' || error.code === 'PGRST204') {
          console.warn('Database access restricted, progress saved locally only');
        } else {
          console.error('Failed to save progress to database:', error);
        }
      }
    };
    
    setUserProgress(prev => {
      const newTotalXP = prev.totalXP + amount;
      const newLevel = calculateLevel(newTotalXP);
      const newStreak = updateStreak();
      
      let newProgress = {
        ...prev,
        totalXP: newTotalXP,
        level: newLevel,
        streak: newStreak,
        lastStudyDate: new Date().toDateString(),
      };
      
      if (subject && newProgress.subjects[subject]) {
        const subjectXP = newProgress.subjects[subject].xp + amount;
        const subjectLevel = calculateLevel(subjectXP);
        newProgress.subjects[subject] = {
          ...newProgress.subjects[subject],
          xp: subjectXP,
          level: subjectLevel,
        };
      }
      
      const newAchievements = checkAchievements(newProgress);
      if (newAchievements.length > 0) {
        newProgress.achievements = [...newProgress.achievements, ...newAchievements.map(a => a.id)];
        newProgress.totalXP += newAchievements.reduce((sum, a) => sum + a.xp, 0);
        newProgress.level = calculateLevel(newProgress.totalXP);
        
        newAchievements.forEach(achievement => {
          window.electronAPI?.showNotification?.(`Achievement Unlocked: ${achievement.name}`, {
            body: achievement.description,
            icon: achievement.icon,
          });
        });
      }
      
      // Save to database asynchronously
      updateProgressData(newProgress);
      
      return newProgress;
    });
  }, [user?.id, calculateLevel, updateStreak, checkAchievements]);

  const completeLesson = useCallback(async (lessonData) => {
    if (!user?.id) return;
    
    const updateProgressData = async (newProgress) => {
      // Save to Supabase with error handling
      try {
        await supabase.from('user_progress').upsert({
          user_id: user.id,
          ...mapToDB(newProgress)
        });
      } catch (error) {
        if (error.code === '42501' || error.code === 'PGRST204') {
          console.warn('Database access restricted, progress saved locally only');
        } else {
          console.error('Failed to save progress to database:', error);
        }
      }
    };
    
    setUserProgress(prev => {
      const xpGained = lessonData.xp || 50;
      const newProgress = {
        ...prev,
        total_lessons_completed: (prev.total_lessons_completed || 0) + 1,
        wordsLearned: (prev.wordsLearned || 0) + (lessonData.newWords || 0),
        daily_progress: (prev.daily_progress || 0) + (lessonData.duration || 5),
      };
      
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (newProgress.weeklyStats[today] !== undefined) {
        newProgress.weeklyStats[today] += lessonData.duration || 5;
      }
      
      // Save to database asynchronously
      updateProgressData(newProgress);
      
      return newProgress;
    });
    
    addXP(lessonData.xp || 50, lessonData.subject);
  }, [user?.id, addXP]);

  const updateProgress = useCallback(async (updates) => {
    if (!user?.id) return;
    
    setUserProgress(prev => {
      const newProgress = { ...prev, ...updates };
      // Save to Supabase with error handling
      (async () => {
        try {
          await supabase.from('user_progress').upsert({
            user_id: user.id,
            ...mapToDB(newProgress)
          });
        } catch (error) {
          if (error.code === '42501' || error.code === 'PGRST204') {
            console.warn('Database access restricted, progress saved locally only');
          } else {
            console.error('Failed to save progress to database:', error);
          }
        }
      })();
      return newProgress;
    });
  }, [user?.id]);

  const setDailyGoal = useCallback(async (minutes) => {
    if (!user?.id) return;
    
    setUserProgress(prev => {
      const newProgress = { ...prev, daily_goal: minutes };
      // Save to Supabase with error handling
      (async () => {
        try {
          await supabase.from('user_progress').upsert({
            user_id: user.id,
            ...mapToDB(newProgress)
          });
        } catch (error) {
          if (error.code === '42501' || error.code === 'PGRST204') {
            console.warn('Database access restricted, progress saved locally only');
          } else {
            console.error('Failed to save progress to database:', error);
          }
        }
      })();
      return newProgress;
    });
  }, [user?.id]);

  // Get progress statistics
  const getProgressStats = useCallback(() => {
    const currentLevel = userProgress.level;
    const currentXP = userProgress.totalXP;
    const xpForCurrentLevel = getXPForNextLevel(currentLevel - 1);
    const xpForNextLevel = getXPForNextLevel(currentLevel);
    const progressToNextLevel = ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
    
    return {
      level: currentLevel,
      xp: currentXP,
      progressToNextLevel: Math.min(progressToNextLevel, 100),
      xpToNextLevel: xpForNextLevel - currentXP,
      streak: userProgress.streak,
      dailyProgress: userProgress.daily_progress,
      dailyGoal: userProgress.daily_goal,
      dailyGoalProgress: (userProgress.daily_progress / userProgress.daily_goal) * 100,
      achievements: (userProgress.achievements || []).map(id => 
        ACHIEVEMENTS.find(a => a.id === id)
      ).filter(Boolean),
      weeklyStats: userProgress.weeklyStats,
    };
  }, [userProgress, getXPForNextLevel]);

  const value = {
    userProgress,
    dailyGoal: userProgress.daily_goal,
    streak: userProgress.streak,
    totalXP: userProgress.totalXP,
    level: userProgress.level,
    achievements: userProgress.achievements,
    updateProgress,
    addXP,
    completeLesson,
    setDailyGoal,
    getProgressStats,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

// Mapping functions
const COLUMN_MAPPING = {
  // JS key: DB column
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
  language: 'language' // Add language mapping to prevent NOT NULL constraint violation
  // Note: 'wordsLearned', 'weeklyStats' and 'subjects' columns removed as they don't exist in database
};

function mapToJS(data) {
  const mapped = {};
  Object.entries(COLUMN_MAPPING).forEach(([jsKey, dbKey]) => {
    if (data.hasOwnProperty(dbKey)) {
      mapped[jsKey] = data[dbKey];
    }
  });
  // Handle fields locally (not stored in database)
  // This prevents PGRST204 errors for missing columns
  
  // Handle wordsLearned locally
  mapped.wordsLearned = 0;
  
  // Handle weeklyStats locally
  mapped.weeklyStats = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0
  };
  
  // Handle subjects locally
  mapped.subjects = {
    vocabulary: { xp: 0, level: 1, progress: 0 },
    grammar: { xp: 0, level: 1, progress: 0 },
    pronunciation: { xp: 0, level: 1, progress: 0 },
    listening: { xp: 0, level: 1, progress: 0 },
    speaking: { xp: 0, level: 1, progress: 0 },
    reading: { xp: 0, level: 1, progress: 0 },
    writing: { xp: 0, level: 1, progress: 0 }
  };
  
  return mapped;
}

function mapToDB(progress) {
  const mapped = {};
  Object.entries(COLUMN_MAPPING).forEach(([jsKey, dbKey]) => {
    if (progress.hasOwnProperty(jsKey)) {
      mapped[dbKey] = progress[jsKey];
    }
  });
  // Note: wordsLearned, weeklyStats and subjects fields are handled locally and not stored in database
  // This prevents PGRST204 errors for missing 'words_learned', 'weekly_stats' and 'subjects' columns
  
  return mapped;
}