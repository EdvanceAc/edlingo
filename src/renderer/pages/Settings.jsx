import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService.js';

const Settings = () => {
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [volume, setVolume] = useState(80);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarError, setAvatarError] = useState(null);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    username: '',
    target_language: '',
    native_language: '',
    placement_level: '',
    avatar_url: ''
  });

  useEffect(() => {
    loadSettings();
    loadProfile();
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

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      const res = await supabaseService.getUserProfile();
      const row = res.success ? res.data : null;
      setProfile(prev => ({
        ...prev,
        full_name: row?.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '',
        email: row?.email || user?.email || '',
        username: row?.username || '',
        target_language: row?.target_language || 'English',
        native_language: row?.native_language || '',
        placement_level: row?.placement_level || '',
        avatar_url: row?.avatar_url || ''
      }));
      setUsernameDraft((row?.username || '').toString());
    } catch (e) {
      setProfileError(e?.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
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

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Username rules (editing): 6-32 chars, a-z 0-9 . _
  const isValidUsername = useMemo(() => {
    const u = (usernameDraft || '').trim();
    return !!u && /^(?![._])(?!.*[._]{2})[a-z0-9._]{6,32}(?<![._])$/.test(u);
  }, [usernameDraft]);

  // Debounced username availability check
  useEffect(() => {
    let timer;
    if (!isUsernameEditing) return () => {};
    const u = (usernameDraft || '').trim();
    if (!u) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^(?![._])(?!.*[._]{2})[a-z0-9._]{6,32}(?<![._])$/.test(u)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    timer = setTimeout(async () => {
      const { success, available } = await supabaseService.checkUsernameAvailable(u);
      if (success) {
        setUsernameStatus(available ? 'available' : 'taken');
      } else {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [usernameDraft, isUsernameEditing]);

  const saveProfile = async () => {
    try {
      setProfileSaving(true);
      setProfileError(null);
      const res = await supabaseService.updateUserProfile(profile);
      if (!res.success) {
        throw new Error(res.error || 'Save failed');
      }
    } catch (e) {
      setProfileError(e?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Username editing handlers
  const startEditUsername = () => {
    setUsernameDraft((profile.username || '').toString());
    setIsUsernameEditing(true);
    setUsernameStatus('idle');
  };

  const cancelEditUsername = () => {
    setUsernameDraft((profile.username || '').toString());
    setIsUsernameEditing(false);
    setUsernameStatus('idle');
  };

  const onUsernameInput = (e) => {
    // Force lowercase and allowed characters only
    const raw = (e.target.value || '').toLowerCase();
    const cleaned = raw
      .replace(/[^a-z0-9._]/g, '')
      .replace(/[._]{2,}/g, '.')
      .replace(/^[._]+|[._]+$/g, '');
    setUsernameDraft(cleaned);
  };

  const handleSaveUsername = async () => {
    try {
      setProfileSaving(true);
      setProfileError(null);
      // Pad to minimum length 6 if needed (append random digits)
      let candidate = (usernameDraft || '').trim().toLowerCase();
      if (!candidate) {
        setProfileError('Username cannot be empty');
        setProfileSaving(false);
        return;
      }
      while (candidate.length < 6) {
        candidate += Math.floor(Math.random() * 10).toString();
      }
      // Validate final candidate
      if (!/^(?![._])(?!.*[._]{2})[a-z0-9._]{6,32}(?<![._])$/.test(candidate)) {
        setProfileError('Username format is invalid');
        setProfileSaving(false);
        return;
      }
      if (usernameStatus === 'taken') {
        setProfileError('Username is already taken');
        setProfileSaving(false);
        return;
      }
      // Persist along with other profile fields to avoid clearing anything
      const payload = { ...profile, username: candidate };
      const res = await supabaseService.updateUserProfile(payload);
      if (!res.success) {
        throw new Error(res.error || 'Save failed');
      }
      // Reflect in UI
      setProfile(prev => ({ ...prev, username: candidate }));
      setIsUsernameEditing(false);
      setUsernameStatus('idle');
    } catch (e) {
      setProfileError(e?.message || 'Failed to save username');
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatarError(null);
      // Basic client-side validation
      const MAX_MB = 5;
      if (!/^image\//.test(file.type)) {
        setAvatarError('Please select an image file');
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setAvatarError(`Max file size is ${MAX_MB}MB`);
        return;
      }
      setAvatarUploading(true);
      setAvatarProgress(0);
      const res = await supabaseService.uploadAvatar(file, (p) => {
        const val = Math.min(100, Math.max(0, Math.round(p)));
        setAvatarProgress(val);
      });
      if (res.success && res.data?.url) {
        setProfile(prev => ({ ...prev, avatar_url: res.data.url }));
      } else if (!res.success) {
        throw new Error(res.error);
      }
    } catch (e) {
      setAvatarError(e?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
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
          {/* Profile Settings */}
          <div className="rounded-2xl p-6 bg-white/50 dark:bg-gray-800/40 backdrop-blur-md ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
              Profile
            </h2>
            {profileLoading ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/60 dark:ring-white/10 bg-white/50 dark:bg-gray-800/50">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🧑‍🎓</div>
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <div className="w-6 h-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin mb-1" />
                        <div className="text-xs">{avatarProgress}%</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 dark:text-gray-300">{profile.email || '—'}</div>
                  </div>
                  <div>
                    <label className={`cursor-pointer text-sm px-3 py-2 rounded-lg ${avatarUploading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'} transition-colors`}>
                      {avatarUploading ? `Uploading ${avatarProgress}%` : 'Change Avatar'}
                      <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={avatarUploading} />
                    </label>
                    {avatarError && <div className="text-xs text-red-600 mt-1">{avatarError}</div>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-800 dark:text-gray-200">Full Name</label>
                    <input
                      name="full_name"
                      value={profile.full_name}
                      onChange={onProfileChange}
                      placeholder="Your name"
                      className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-gray-800 dark:text-gray-200">Username</label>
                    <div className="relative">
                      <input
                        name="username"
                        value={isUsernameEditing ? usernameDraft : (profile.username || '')}
                        onChange={isUsernameEditing ? onUsernameInput : () => {}}
                        placeholder="username"
                        disabled={!isUsernameEditing}
                        maxLength={32}
                        aria-invalid={usernameStatus === 'taken' || usernameStatus === 'invalid'}
                        className={`w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 focus:outline-none focus:ring-2 ${
                          !isUsernameEditing ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 dark:text-white'
                        } ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'focus:ring-red-500' : 'focus:ring-indigo-400'
                        }`}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                        {isUsernameEditing && usernameStatus === 'checking' && <span className="text-gray-500">Checking…</span>}
                        {isUsernameEditing && usernameStatus === 'available' && <span className="text-green-600">Available</span>}
                        {isUsernameEditing && usernameStatus === 'taken' && <span className="text-red-600">Taken</span>}
                        {isUsernameEditing && usernameStatus === 'invalid' && <span className="text-red-600">Invalid</span>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Use 6–32 characters: a-z, 0-9, dot or underscore. Can't start/end with . or _
                    </p>
                    {!isUsernameEditing ? (
                      <button
                        type="button"
                        onClick={startEditUsername}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors"
                      >
                        Edit Username
                      </button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveUsername}
                          disabled={profileSaving}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm transition-colors disabled:opacity-70"
                        >
                          {profileSaving ? 'Saving…' : 'Save Username'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditUsername}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-800 dark:text-gray-200">Target Language</label>
                    <select
                      name="target_language"
                      value={profile.target_language}
                      onChange={onProfileChange}
                      className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {['English','Spanish','French','German','Italian','Portuguese','Chinese','Japanese','Korean','Arabic','Persian'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-800 dark:text-gray-200">Native Language</label>
                    <input
                      name="native_language"
                      value={profile.native_language}
                      onChange={onProfileChange}
                      placeholder="e.g., Persian"
                      className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveProfile}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                  {profileError && <span className="text-sm text-red-600">{profileError}</span>}
                </div>
              </div>
            )}
          </div>

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