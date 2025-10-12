import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Bell, 
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

const Header = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { level, totalXP, streak } = useProgress();
  const { isPlaying } = useAudio();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Mock notifications
  const notifications = [
    {
      id: 1,
      title: 'Daily Goal Achieved!',
      message: 'You\'ve completed your 30-minute daily goal.',
      time: '2 minutes ago',
      type: 'success'
    },
    {
      id: 2,
      title: 'New Achievement',
      message: 'You\'ve unlocked "Week Warrior" achievement!',
      time: '1 hour ago',
      type: 'achievement'
    },
    {
      id: 3,
      title: 'Lesson Reminder',
      message: 'Don\'t forget to practice pronunciation today.',
      time: '3 hours ago',
      type: 'reminder'
    }
  ];

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
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="text-white bg-white/10 ring-1 ring-white/15 hover:bg-white/20 hover:ring-white/25 transition-all duration-300"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm ring-1 ring-white/20 shadow-sm transition-transform duration-300 hover:scale-105">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="font-bold text-xl text-white drop-shadow-lg">EdLingo</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="relative flex items-center space-x-3 bg-white/10 backdrop-blur-md rounded-full px-6 py-2 ring-1 ring-white/20 shadow-sm">
            {/* soft shimmer sweep */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-40 animate-[shine_3.6s_linear_infinite]" />
            <style>{`@keyframes shine{0%{transform:translateX(-60%)}100%{transform:translateX(160%)}}`}</style>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 shadow-sm transition-transform duration-200 hover:scale-105">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">🔥</span>
              </div>
              <span className="text-sm font-bold text-white">{streak} day streak</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 shadow-sm transition-transform duration-200 hover:scale-105">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">⭐</span>
              </div>
              <span className="text-sm font-bold text-white">Level {level}</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 shadow-sm transition-transform duration-200 hover:scale-105">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">💎</span>
              </div>
              <span className="text-sm font-bold text-white">{totalXP ? totalXP.toLocaleString() : 0} XP</span>
            </div>
          </div>
        </div>

      {/* Right Section - Controls */}
      <div className="flex items-center space-x-2 flex-1 justify-end">
        {/* Database Status */}
        {AppConfig.isDatabaseEnabled() && <DatabaseStatus />}
        
        {/* Audio Status */}
        <button
          onClick={toggleMute}
          className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors relative"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          {isPlaying && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-white hover:bg-white/15 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
              >
                {notifications.length}
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
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'achievement' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border">
                <button className="w-full text-sm text-center py-2 hover:bg-accent rounded transition-colors">
                  View All Notifications
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
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
                <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-accent transition-colors">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:bg-accent transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-border my-2" />
                <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-accent transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Window Controls (Electron) */}
        <div className="flex items-center space-x-1 ml-4">
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