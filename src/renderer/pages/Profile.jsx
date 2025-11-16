import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../providers/ProgressProvider';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService.js';

const StatCard = ({ title, value, accent }) => (
  <div className="flex-1 rounded-2xl p-6 bg-white/60 dark:bg-gray-800/50 backdrop-blur ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
    <div className="text-sm text-gray-600 dark:text-gray-300">{title}</div>
    <div className={`mt-2 text-2xl font-semibold bg-clip-text text-transparent ${accent}`}>{value}</div>
  </div>
);

const Label = ({ children }) => (
  <label className="text-sm text-gray-700 dark:text-gray-300">{children}</label>
);

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
  />
);

const Select = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-800/50 backdrop-blur ring-1 ring-white/60 dark:ring-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
  >
    {children}
  </select>
);

const SectionCard = ({ title, children }) => (
  <div className="rounded-2xl p-6 bg-white/60 dark:bg-gray-800/50 backdrop-blur ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
    <h2 className="text-lg font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600">
      {title}
    </h2>
    {children}
  </div>
);

const USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-z0-9._]{6,32}(?<![._])$/;

const Profile = () => {
  const { user } = useAuth();
  const { level, totalXP, streak, userProgress } = useProgress();
  const navigate = useNavigate();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [profileError, setProfileError] = useState(null);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    username: '',
    target_language: '',
    native_language: '',
    placement_level: '',
    avatar_url: ''
  });

  const dailyGoal = useMemo(() => userProgress?.daily_goal ?? 30, [userProgress]);
  const dailyProgress = useMemo(() => userProgress?.daily_progress ?? 0, [userProgress]);

  useEffect(() => {
    const loadProfileAndSessions = async () => {
      try {
        setProfileLoading(true);
        setProfileError(null);
        const result = await supabaseService.getUserProfile();
        const row = result.success ? result.data : null;
        if (!result.success && result.error) {
          setProfileError(result.error);
        }
        setForm(prev => ({
          ...prev,
          full_name: row?.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name || '',
          email: row?.email || user?.email || '',
          username: row?.username || '',
          target_language: row?.target_language || userProgress?.language || 'English',
          native_language: row?.native_language || '',
          placement_level: row?.placement_level || '',
          avatar_url: row?.avatar_url || ''
        }));
        setUsernameDraft((row?.username || '').toString());
        setIsUsernameEditing(false);
        setUsernameStatus('idle');
        setAssessmentDate(row?.initial_assessment_date || null);
      } catch (err) {
        console.warn('Profile load error:', err);
        setProfileError(err?.message || 'Failed to load profile');
      } finally {
        setProfileLoading(false);
      }

      if (user?.id) {
        const { success, data } = await supabaseService.getUserSessions(user.id, 5);
        if (success) {
          setSessions(data || []);
        }
      }
    };
    loadProfileAndSessions();
  }, [user?.id, userProgress?.language, userProgress?.cefrLevel]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const startEditUsername = () => {
    setUsernameDraft((form.username || '').toString());
    setIsUsernameEditing(true);
    setUsernameStatus('idle');
    setProfileError(null);
  };

  const cancelEditUsername = () => {
    setUsernameDraft((form.username || '').toString());
    setIsUsernameEditing(false);
    setUsernameStatus('idle');
  };

  const onUsernameInput = (e) => {
    const raw = (e.target.value || '').toLowerCase();
    const cleaned = raw
      .replace(/[^a-z0-9._]/g, '')
      .replace(/[._]{2,}/g, '.')
      .replace(/^[._]+|[._]+$/g, '');
    setUsernameDraft(cleaned);
  };

  useEffect(() => {
    if (!isUsernameEditing) return undefined;
    const u = (usernameDraft || '').trim();
    if (!u) {
      setUsernameStatus('idle');
      return undefined;
    }
    if (!USERNAME_REGEX.test(u)) {
      setUsernameStatus('invalid');
      return undefined;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const { success, available } = await supabaseService.checkUsernameAvailable(u);
      if (success) {
        setUsernameStatus(available ? 'available' : 'taken');
      } else {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [usernameDraft, isUsernameEditing]);

  const handleSaveUsername = async () => {
    try {
      setProfileSaving(true);
      setProfileError(null);
      let candidate = (usernameDraft || '').trim().toLowerCase();
      if (!candidate) {
        setProfileError('Username cannot be empty');
        return;
      }
      while (candidate.length < 6) {
        candidate += Math.floor(Math.random() * 10).toString();
      }
      if (!USERNAME_REGEX.test(candidate)) {
        setProfileError('Username format is invalid');
        return;
      }
      if (usernameStatus === 'taken') {
        setProfileError('Username is already taken');
        return;
      }
      const payload = { username: candidate };
      const res = await supabaseService.updateUserProfile(payload);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save username');
      }
      setForm(prev => ({ ...prev, username: candidate }));
      setUsernameDraft(candidate);
      setIsUsernameEditing(false);
      setUsernameStatus('idle');
    } catch (err) {
      setProfileError(err?.message || 'Failed to save username');
    } finally {
      setProfileSaving(false);
    }
  };

  const saveProfile = async () => {
    try {
      setProfileSaving(true);
      setProfileError(null);
      const payload = {
        full_name: form.full_name || null,
        target_language: form.target_language || null,
        native_language: form.native_language || null,
        avatar_url: form.avatar_url || null
      };
      const result = await supabaseService.updateUserProfile(payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile');
      }
    } catch (err) {
      setProfileError(err?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatarError(null);
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
      const res = await supabaseService.uploadAvatar(file, (progress) => {
        const val = Math.min(100, Math.max(0, Math.round(progress)));
        setAvatarProgress(val);
      });
      if (!res.success) {
        throw new Error(res.error || 'Failed to upload avatar');
      }
      if (res.data?.url) {
        setForm(prev => ({ ...prev, avatar_url: res.data.url }));
      }
    } catch (err) {
      setAvatarError(err?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 max-w-5xl mx-auto relative"
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-emerald-50" />
      <div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl ring-1 ring-white/60 dark:ring-white/20 shadow-2xl p-8">
        <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br from-indigo-200/40 via-fuchsia-200/40 to-emerald-200/40" />
        <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-fuchsia-700 dark:from-indigo-300 dark:to-fuchsia-300">
          Profile
        </h1>

        {profileLoading ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading...</div>
        ) : (
          <div className="space-y-6 relative">
            {/* Header: avatar + name */}
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/60 dark:ring-white/10 bg-white/50 dark:bg-gray-800/50">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🧑‍🎓</div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-8 h-8 rounded-full border-2 border-white/70 border-t-transparent animate-spin mb-1" />
                    <div className="text-xs">{avatarProgress}%</div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-xl font-semibold">{form.full_name || 'User'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{form.email}</div>
              </div>
              <div>
                <label
                  className={`cursor-pointer text-sm px-3 py-2 rounded-lg ${avatarUploading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'} transition-colors`}
                >
                  {avatarUploading ? `Uploading ${avatarProgress}%` : 'Change Avatar'}
                  <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={avatarUploading} />
                </label>
                {avatarError && <div className="text-xs text-red-600 mt-1">{avatarError}</div>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Current Level" value={`Level ${level}`} accent="bg-gradient-to-r from-indigo-700 to-fuchsia-700" />
              <StatCard title="Total XP" value={`${(totalXP || 0).toLocaleString()} XP`} accent="bg-gradient-to-r from-purple-700 to-pink-700" />
              <StatCard title="Active Streak" value={`${streak} days`} accent="bg-gradient-to-r from-emerald-700 to-teal-700" />
            </div>

            {/* Placement level */}
            <SectionCard title="Placement Level">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">CEFR placement</div>
                  <div className="text-2xl font-semibold mt-1">
                    {form.placement_level || 'Not assessed yet'}
                  </div>
                  {assessmentDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Assessed on {new Date(assessmentDate).toLocaleDateString()}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Placement is determined by the official assessment. Retake the assessment whenever you want to refresh your level.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/assessment')}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:from-indigo-700 hover:to-fuchsia-700 transition-colors"
                >
                  {form.placement_level ? 'Retake Assessment' : 'Take Assessment'}
                </button>
              </div>
            </SectionCard>

            {/* Daily goal */}
            <SectionCard title="Daily Goal">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm">Today's Progress</div>
                  <div className="h-3 w-full rounded-full bg-white/50 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-3 bg-gradient-to-r from-indigo-600 to-fuchsia-600"
                      style={{ width: `${Math.min(100, Math.round((dailyProgress / Math.max(1, dailyGoal)) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    {dailyProgress}m of {dailyGoal}m
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Editable info */}
            <SectionCard title="User Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input name="full_name" value={form.full_name} onChange={onChange} placeholder="Your name" />
                </div>
                <div>
                  <Label>Username</Label>
                  <div className="relative">
                    <Input
                      name="username"
                      value={isUsernameEditing ? usernameDraft : (form.username || '')}
                      onChange={isUsernameEditing ? onUsernameInput : () => {}}
                      placeholder="username"
                      disabled={!isUsernameEditing}
                      maxLength={32}
                      aria-invalid={usernameStatus === 'taken' || usernameStatus === 'invalid'}
                      className={`${!isUsernameEditing ? 'text-gray-400 cursor-not-allowed' : ''} ${
                        usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'ring-red-200 focus:ring-red-500' : ''
                      }`}
                    />
                    {isUsernameEditing && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                        {usernameStatus === 'checking' && <span className="text-gray-500">Checking...</span>}
                        {usernameStatus === 'available' && <span className="text-green-600">Available</span>}
                        {usernameStatus === 'taken' && <span className="text-red-600">Taken</span>}
                        {usernameStatus === 'invalid' && <span className="text-red-600">Invalid</span>}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Use 6-32 characters: a-z, 0-9, dot or underscore. Can't start/end with . or _
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
                        {profileSaving ? 'Saving...' : 'Save Username'}
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
                  <Label>Target Language</Label>
                  <Select name="target_language" value={form.target_language} onChange={onChange}>
                    {['English','Spanish','French','German','Italian','Portuguese','Chinese','Japanese','Korean','Arabic','Persian'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Native Language</Label>
                  <Input name="native_language" value={form.native_language} onChange={onChange} placeholder="e.g., Persian" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
                {profileError && <span className="text-sm text-red-600">{profileError}</span>}
              </div>
            </SectionCard>

            {/* Achievements */}
            <SectionCard title="Achievements">
              <div className="flex flex-wrap gap-2">
                {(userProgress?.achievements || []).length === 0 ? (
                  <span className="text-sm text-gray-600 dark:text-gray-300">No achievements yet.</span>
                ) : (
                  (userProgress.achievements || []).map((a, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-white/60 dark:bg-gray-800/50 ring-1 ring-white/60 dark:ring-white/10 text-sm">
                      {a?.icon || '🏅'} {a?.name || a}
                    </span>
                  ))
                )}
              </div>
            </SectionCard>

            {/* Recent sessions */}
            <SectionCard title="Recent Activity">
              <div className="space-y-2">
                {sessions && sessions.length > 0 ? (
                  sessions.map(s => (
                    <div key={s.id || s.created_at} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/40 ring-1 ring-white/60 dark:ring-white/10">
                      <div className="text-sm">
                        {s.session_type || 'Learning session'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-300">No activity found.</div>
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Profile;