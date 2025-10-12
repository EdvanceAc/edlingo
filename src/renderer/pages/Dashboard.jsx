import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  BookOpen,
  MessageCircle,
  Mic,
  GraduationCap,
  Clock,
  Flame,
  Star,
  ChevronRight,
  Play,
  BarChart3
} from 'lucide-react';
import { useProgress } from '../providers/ProgressProvider';
import CourseSection from '../../components/Course/CourseSection';

const Dashboard = () => {
  const { getProgressStats, userProgress } = useProgress();
  const [stats, setStats] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setStats(getProgressStats());
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [getProgressStats]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Continue Learning',
      description: 'Resume your last lesson',
      icon: Play,
      href: '/vocabulary',
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600'
    },
    {
      title: 'Practice Speaking',
      description: 'Improve pronunciation',
      icon: Mic,
      href: '/pronunciation',
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600'
    },
    {
      title: 'Chat Practice',
      description: 'Conversation with AI',
      icon: MessageCircle,
      href: '/enhanced-chat',
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600'
    },
    {
      title: 'Grammar Exercises',
      description: 'Master language rules',
      icon: GraduationCap,
      href: '/grammar',
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600'
    }
  ];

  const recentAchievements = stats.achievements.slice(-3);

  const weeklyData = Object.entries(stats.weeklyStats).map(([day, minutes]) => ({
    day: day.charAt(0).toUpperCase() + day.slice(1, 3),
    minutes,
    percentage: (minutes / stats.dailyGoal) * 100
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
              Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 18 ? 'afternoon' : 'evening'}! 🌟
            </h1>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">
              Ready to continue your language learning journey?
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Level Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-premium card-hover p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Level</p>
                <p className="text-2xl font-bold">{stats.level}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Level {stats.level + 1}</span>
              <span>{Math.round(stats.progressToNextLevel)}%</span>
            </div>
            <div className="progress-modern">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.progressToNextLevel}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="progress-modern-bar"
              />
            </div>
          </div>
        </motion.div>

        {/* Daily Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card card-premium card-hover p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Goal</p>
                <p className="text-2xl font-bold">{stats.dailyProgress}m</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>of {stats.dailyGoal} minutes</span>
              <span>{Math.round(stats.dailyGoalProgress)}%</span>
            </div>
            <div className="progress-modern">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.dailyGoalProgress, 100)}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className="progress-modern-bar"
              />
            </div>
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-premium card-hover p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold">{stats.streak} days</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Keep it up! 🔥
          </p>
        </motion.div>

        {/* Total XP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card card-premium card-hover p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="text-2xl font-bold">{stats.xp.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {stats.xpToNextLevel} XP to next level
          </p>
        </motion.div>
      </div>

      

      {/* Course Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <CourseSection />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="card card-premium relative overflow-hidden p-6 border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl">
            <div className="pointer-events-none absolute -top-10 -left-10 w-52 h-52 rounded-full bg-primary/20 blur-2xl" />
            <h2 className="text-xl font-bold mb-6 flex items-center tracking-tight">
              <Play className="w-5 h-5 mr-2 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.08 }}
                  >
                    <Link
                      to={action.href}
                      className="group block p-4 rounded-xl border border-primary/20 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-200 hover:shadow-soft"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-105 transition-transform shadow-soft`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground group-hover:text-primary">
                            {action.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-sm ring-1 ring-primary/40 shadow-md shadow-primary/30 flex items-center justify-center transition-all group-hover:bg-white/80 group-hover:ring-primary/60">
                          <ChevronRight className="w-4 h-4 text-primary drop-shadow-sm group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Recent Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-6"
        >
          {/* Achievements */}
          <div className="card card-premium relative overflow-hidden p-6 border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl">
            <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 rounded-full bg-primary/20 blur-2xl" />
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Recent Achievements
            </h2>
            <div className="space-y-3">
              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                  >
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary glass px-2 py-1 rounded-md">+{achievement.xp} XP</span>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Complete lessons to earn achievements! 🏆
                </p>
              )}
            </div>
          </div>

          {/* Weekly Progress Chart */}
          <div className="card card-premium relative overflow-hidden p-6 border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl">
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-44 h-44 rounded-full bg-primary/20 blur-2xl" />
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              This Week
            </h2>
            <div className="space-y-3">
              {weeklyData.map((day, index) => (
                <motion.div
                  key={day.day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-medium w-8">{day.day}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10 backdrop-blur-sm">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(day.percentage, 100)}%` }}
                      transition={{ duration: 0.8, delay: 1 + index * 0.1 }}
                      className={`h-full rounded-full shadow-soft ${
                        day.percentage >= 100 
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : day.percentage >= 50
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          : 'bg-gradient-to-r from-blue-400 to-blue-600'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{day.minutes}m</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;