import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../providers/ThemeProvider';
import { useAI } from '../providers/AIProvider';

const Settings = () => {
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [volume, setVolume] = useState(80);
  const [showApiKey, setShowApiKey] = useState(false);
  const { theme, setTheme } = useTheme();
  const { aiSettings, saveAISettings, aiStatus, getStatusMessage } = useAI();

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

  const handleAISettingsChange = async (newSettings) => {
    try {
      await saveAISettings(newSettings);
      console.log('AI settings saved successfully');
    } catch (error) {
      console.error('Failed to save AI settings:', error);
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

          {/* AI Settings */}
          <div className="rounded-2xl p-6 bg-white/50 dark:bg-gray-800/40 backdrop-blur-md ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
              AI Configuration
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Status</span>
                <span className={`text-sm px-3 py-1 rounded-full backdrop-blur-sm ring-1 ring-white/60 ${
                  aiStatus === 'ready' ? 'bg-green-100 text-green-800' :
                  aiStatus === 'initializing' ? 'bg-yellow-100 text-yellow-800' :
                  aiStatus === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusMessage()}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="text-gray-800 dark:text-gray-200 min-w-[120px]">AI Provider:</label>
                <select
                  value={aiSettings.provider}
                  onChange={(e) => handleAISettingsChange({ provider: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="transformers">Transformers.js (Local)</option>
                  <option value="openai">OpenAI API</option>

                <option value="vertex-ai">Google Vertex AI</option>
                </select>
              </div>
              
              {aiSettings.provider !== 'transformers' && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <label className="text-gray-800 dark:text-gray-200 min-w-[120px]">API Key:</label>
                    <div className="flex-1 relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={aiSettings.apiKey}
                        onChange={(e) => handleAISettingsChange({ apiKey: e.target.value })}
                        placeholder={`Enter your ${aiSettings.provider} API key`}
                        className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showApiKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 ml-[120px]">
                    {aiSettings.provider === 'openai' && 'Get your API key from https://platform.openai.com/api-keys'}
                    {aiSettings.provider === 'vertex-ai' && 'Configure Google Cloud authentication with: gcloud auth application-default login'}
                  </p>
                </div>
              )}
              
              {aiSettings.provider === 'transformers' && (
                <div className="ml-[120px]">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    ✓ Using local AI models - no API key required
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Models run locally in your browser for privacy and offline use
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <label className="text-gray-800 dark:text-gray-200 min-w-[120px]">AI Model:</label>
                <input
                  type="text"
                  value={aiSettings.model}
                  onChange={(e) => handleAISettingsChange({ model: e.target.value })}
                  placeholder="Model name or ID"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 ml-[120px]">
                Specify the AI model to use (e.g., gpt-3.5-turbo for OpenAI)
              </p>
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