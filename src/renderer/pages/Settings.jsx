import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../providers/ThemeProvider';

const Settings = () => {
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [volume, setVolume] = useState(80);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI?.getSettings?.() || {};
      
      setLanguage(savedSettings.language || 'en');
      setVolume(savedSettings.volume || 50);
      setNotifications(savedSettings.notifications !== false);
      setAutoSave(savedSettings.autoSave !== false);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        language,
        volume,
        notifications,
        autoSave
      };
      
      await window.electronAPI?.saveSettings?.(settings);
      
      // Show success message (you could add a toast notification here)
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 max-w-4xl mx-auto relative"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-emerald-50" />
      <div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl ring-1 ring-white/60 dark:ring-white/20 shadow-2xl p-8">
        <div className="pointer-events-none absolute inset-0 opacity-80 bg-gradient-to-br from-indigo-200/50 via-fuchsia-200/40 to-emerald-200/50" />
        <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-fuchsia-700 dark:from-indigo-300 dark:to-fuchsia-300">
          Settings
        </h1>

        <div className="space-y-6 relative">
          {/* Theme Settings */}
          <div className="rounded-2xl p-6 bg-white/50 dark:bg-gray-800/40 backdrop-blur-md ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
              Appearance
            </h2>
            <div className="flex items-center space-x-4">
              <label className="text-gray-800 dark:text-gray-200">Theme:</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          {/* Language Settings */}
          <div className="rounded-2xl p-6 bg-white/50 dark:bg-gray-800/40 backdrop-blur-md ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
              Language
            </h2>
            <div className="flex items-center space-x-4">
              <label className="text-gray-800 dark:text-gray-200">Interface Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="rounded-2xl p-6 bg-white/50 dark:bg-gray-800/40 backdrop-blur-md ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
              Audio
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 rounded-xl p-4 bg-white/50 dark:bg-gray-800/40 backdrop-blur ring-1 ring-white/60 dark:ring-white/10">
                <label className="text-gray-800 dark:text-gray-200 min-w-[100px]">Volume:</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-gray-800 dark:text-gray-200 min-w-[40px]">{volume}%</span>
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="rounded-2xl p-6 bg-white/50 dark:bg-gray-800/40 backdrop-blur-md ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
              General
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl p-4 bg-white/50 dark:bg-gray-800/40 backdrop-blur ring-1 ring-white/60 dark:ring-white/10">
                <label className="text-gray-800 dark:text-gray-200">
                  Enable Notifications
                </label>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl p-4 bg-white/50 dark:bg-gray-800/40 backdrop-blur ring-1 ring-white/60 dark:ring-white/10">
                <label className="text-gray-800 dark:text-gray-200">
                  Auto-save Progress
                </label>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-medium shadow-lg hover:from-indigo-700 hover:to-fuchsia-700 transition-colors duration-200"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;