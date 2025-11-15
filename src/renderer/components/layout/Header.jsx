import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Bell, 
  BellRing,
  Search, 
  User, 
  Settings,
  LogOut,
  Minimize2,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  Menu
} from 'lucide-react';
import Button from '../ui/Button';
import { useTheme } from '../../providers/ThemeProvider';
import { useProgress } from '../../providers/ProgressProvider';
import { useAudio } from '../../providers/AudioProvider';
import DatabaseStatus from '../DatabaseStatus';
import { AppConfig } from '../../../config/AppConfig';
import MobileMenu from './MobileMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext.jsx';
import formatRelativeTime from '../../utils/time.js';

const Header = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { level, totalXP, streak } = useProgress();
  const { isPlaying } = useAudio();
  const { signOut } = useAuth();
  const {
    notifications: notificationFeed,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading: notificationsLoading,
    connectionState
  } = useNotifications();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detect browser (non-Electron) mode to control desktop-only UI differences
  const isBrowserMode = typeof window !== 'undefined' && (!window.electronAPI || window.isBrowserMode);

  const recentNotifications = useMemo(
    () => notificationFeed.slice(0, 5),
    [notificationFeed]
  );

  const realtimeHealthy = ['subscribed', 'connected', 'open', 'ready'].includes(
    (connectionState || '').toLowerCase()
  );

  const handleWindowControl = async (action) => {
    try {
      switch (action) {
        case 'minimize':
          await window.electronAPI?.minimizeWindow?.();
          break;
        case 'maximize':
          await window.electronAPI?.maximizeWindow?.();
          break;
        case 'close':
          await window.electronAPI?.closeWindow?.();
          break;
      }
    } catch (error) {
      console.error('Window control error:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Implement mute functionality
  };

  return (
    <header className="sticky top-0 z-50 w-full relative border-b border-white/15 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-2xl shadow-xl">
      {/* Aurora accents for premium feel */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-8 -left-24 h-40 w-40 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute -bottom-10 left-1/3 h-32 w-56 rounded-full bg-indigo-400/25 blur-2xl" />
        <div className="absolute -top-6 right-0 h-28 w-28 rounded-full bg-pink-400/20 blur-2xl" />
      </div>
      <div className="container grid grid-cols-2 md:grid-cols-3 items-center h-14 sm:h-16 px-2 sm:px-4 gap-2">
        <div className="col-span-1 flex items-center space-x-3 sm:space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
              if (isDesktop) {
                onToggleSidebar?.();
              } else {
                setIsMobileMenuOpen((prev) => !prev);
              }
            }}
            className={`text-white bg-white/10 ring-1 ring-white/15 hover:bg-white/20 hover:ring-white/25 transition-all duration-300 ${isBrowserMode ? 'md:hidden' : ''}`}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm ring-1 ring-white/20 shadow-sm transition-transform duration-300 hover:scale-105">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg sm:text-xl text-white drop-shadow-lg">EdLingo</span>
          </div>
        </div>

        <div className="col-span-1 min-w-0 hidden md:flex justify-start md:justify-center">
          <div className="relative flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-md rounded-full px-3 sm:px-6 py-1.5 sm:py-2 ring-1 ring-white/20 shadow-sm overflow-x-auto scrollbar-hide whitespace-nowrap max-w-full">
            {/* soft shimmer sweep */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-40 animate-[shine_3.6s_linear_infinite]" />
            <style>{`@keyframes shine{0%{transform:translateX(-60%)}100%{transform:translateX(160%)}}`}</style>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 shadow-sm transition-transform duration-200 hover:scale-105">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">🔥</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">{streak} day streak</span>
            </div>
            
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 shadow-sm transition-transform duration-200 hover:scale-105">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">⭐</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">Level {level}</span>
            </div>
            
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 shadow-sm transition-transform duration-200 hover:scale-105">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">💎</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">{totalXP ? totalXP.toLocaleString() : 0} XP</span>
            </div>
          </div>
        </div>

      {/* Right Section - Controls */}
      <div className="col-span-1 flex items-center justify-end space-x-1 sm:space-x-2">
        {/* Database Status */}
        {AppConfig.isDatabaseEnabled() && (
          <div className="transform scale-90 sm:scale-100 origin-right">
            <DatabaseStatus />
          </div>
        )}
        
        {/* Audio Status */}
        <button
          onClick={toggleMute}
          className="hidden md:inline-flex items-center justify-center rounded-md px-2 py-2 hover:bg-white/10 transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="hidden md:inline-flex p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors relative"
            title="Notifications"
          >
            {unreadCount > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.div>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50"
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <p className="text-xs text-muted-foreground">پیگیر تمریناتت هستیم</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        realtimeHealthy ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'
                      }`}
                    />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {realtimeHealthy ? 'live' : 'syncing'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-4 text-xs text-muted-foreground">Loading notifications...</div>
                ) : recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No notifications yet. Keep learning and we’ll keep you posted ✨
                  </div>
                ) : (
                  recentNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={`w-full text-left p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors ${
                        notification.isRead ? 'opacity-70' : ''
                      }`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.actionUrl) {
                          navigate(notification.actionUrl);
                          setShowNotifications(false);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success'
                              ? 'bg-green-500'
                              : notification.type === 'achievement'
                                ? 'bg-yellow-500'
                                : notification.type === 'reminder'
                                  ? 'bg-blue-500'
                                  : 'bg-purple-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.priority === 'high' && (
                            <span className="text-[10px] text-red-500 font-semibold uppercase mt-2 inline-block">
                              مهم
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border flex items-center justify-between">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                  onClick={() => markAllAsRead()}
                >
                  Mark all as read
                </button>
                <button
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    navigate('/courses');
                    setShowNotifications(false);
                  }}
                >
                  View all
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50"
            >
              <div className="p-4 border-b border-border">
                <p className="font-semibold text-sm">Language Learner</p>
                <p className="text-xs text-muted-foreground">Level {level} • {totalXP} XP</p>
              </div>
              <div className="py-2">
                <button
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-border my-2" />
                <button
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-accent transition-colors"
                  onClick={async () => { try { await signOut(); } catch (e) { console.error(e); } finally { setShowUserMenu(false); navigate('/'); } }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Window Controls (Electron) */}
        <div className="hidden sm:flex items-center space-x-1 ml-4">
          <button
            onClick={() => handleWindowControl('minimize')}
            className="p-2 rounded bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleWindowControl('maximize')}
            className="p-2 rounded bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors"
            title="Maximize"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleWindowControl('close')}
            className="p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>

      {isMobileMenuOpen && (
        <MobileMenu onClose={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;