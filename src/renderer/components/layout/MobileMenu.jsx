import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Menu, Flame, Zap, Settings, User, Bell, Sun, Moon, Volume2, VolumeX, MessageSquare, ClipboardCheck } from 'lucide-react';
import { useProgress } from '../../providers/ProgressProvider';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../providers/ThemeProvider';
import supabaseService from '../../services/supabaseService';
import { useAudio } from '../../providers/AudioProvider';

export default function MobileMenu({ onClose }) {
  const { getProgressStats } = useProgress();
  const stats = getProgressStats();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isPlaying } = useAudio();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await supabaseService.getNotifications(5);
        if (mounted && result?.success) {
          setNotifications(Array.isArray(result.data) ? result.data : []);
        } else {
          // Fallback mock notifications
          setNotifications([
            { id: 'm1', title: 'Daily Goal Achieved!', message: 'You completed 30 minutes.', isRead: false, type: 'success', timestamp: new Date() },
            { id: 'm2', title: 'New Badge', message: 'Week Warrior unlocked!', isRead: false, type: 'achievement', timestamp: new Date() },
            { id: 'm3', title: 'Reminder', message: 'Practice pronunciation today.', isRead: true, type: 'reminder', timestamp: new Date() },
          ]);
        }
      } catch (e) {
        setNotifications([
          { id: 'm1', title: 'Daily Goal Achieved!', message: 'You completed 30 minutes.', isRead: false, type: 'success', timestamp: new Date() },
          { id: 'm2', title: 'New Badge', message: 'Week Warrior unlocked!', isRead: false, type: 'achievement', timestamp: new Date() },
          { id: 'm3', title: 'Reminder', message: 'Practice pronunciation today.', isRead: true, type: 'reminder', timestamp: new Date() },
        ]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const progressPercent = Math.max(0, Math.min(100, Math.round(stats?.progressToNextLevel || 0)));

  const overlay = (
    <div className={`fixed inset-0 z-[1000] md:hidden ${theme === 'dark' ? 'dark' : ''}`}> 
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Left Drawer */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[380px] rounded-r-2xl bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close mobile menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Menu</span>
          </button>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">EdLingo</div>
        </div>

        {/* Progress Overview */}
        <div className="px-4 pt-4 pb-2">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 ring-1 ring-gray-200 dark:ring-gray-800 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400/90 text-white flex items-center justify-center shadow">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-base text-gray-900 dark:text-gray-100">Level {stats?.level ?? 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stats?.xp ?? 0} XP</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats?.streak ?? 0}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">day streak</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {typeof stats?.xpToNextLevel === 'number' && (
                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  {stats.xpToNextLevel} XP to next level
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pt-3">
          <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">Quick actions</div>
          <div className="grid grid-cols-2 gap-3">
            {/* Profile */}
            <button
              onClick={() => { onClose?.(); navigate('/profile'); }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/15 dark:to-indigo-500/15 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 dark:bg-blue-500/25 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Profile</span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/15 dark:to-pink-500/15 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all relative"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 dark:bg-purple-500/25 flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Notifications</span>
            </button>

            {/* Sound */}
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/15 dark:to-teal-500/15 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all relative"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/25 flex items-center justify-center relative">
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                )}
                {isPlaying && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{isMuted ? 'Sound Off' : 'Sound On'}</span>
            </button>

            {/* Dark Mode */}
            <button
              onClick={() => toggleTheme()}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-gray-500/10 to-slate-500/10 dark:from-gray-700/20 dark:to-slate-700/20 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 dark:bg-gray-700/30 flex items-center justify-center">
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
          </div>
        </div>

        {/* Feature Navigation */}
        <div className="px-4 pt-3">
          <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">More features</div>
          <div className="grid grid-cols-2 gap-3">
            {/* Enhanced Chat */}
            <button
              onClick={() => { onClose?.(); navigate('/enhanced-chat'); }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 dark:from-indigo-500/15 dark:to-fuchsia-500/15 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/25 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Enhanced Chat</span>
            </button>

            {/* Assessment */}
            <button
              onClick={() => { onClose?.(); navigate('/assessment'); }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 dark:from-pink-500/15 dark:to-rose-500/15 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-pink-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 dark:bg-pink-500/25 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-pink-600 dark:text-pink-300" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Assessment</span>
            </button>
          </div>
        </div>

        {/* Notifications Panel */}
        {notifOpen && (
          <div className="px-4 mt-2">
            <div className="rounded-xl ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
                <button className="text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100" onClick={() => setNotifOpen(false)}>Close</button>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-xs text-gray-500 dark:text-gray-300">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${n.isRead ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          n.type === 'success' ? 'bg-green-500' : n.type === 'achievement' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{n.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{n.message}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800">
                <button className="w-full text-xs font-medium text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">View all</button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 pb-6">
          <div className="px-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => { onClose?.(); navigate('/settings'); }}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Settings</div>
            </button>
          </div>
        </div>
      </motion.aside>
    </div>
  );

  return createPortal(overlay, document.body);
}