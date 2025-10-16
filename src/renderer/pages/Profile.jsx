import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useProgress } from '../providers/ProgressProvider';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabaseConfig.js';
import supabaseService from '../services/supabaseService.js';
import supabaseStorageService from '../services/supabaseStorageService.js';

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

const Profile = () => {
  const { user } = useAuth();
  const { level, totalXP, streak, userProgress } = useProgress();

  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

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
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Resolve current user's profile id or create if missing
        const id = await supabaseService.getOrCreateUserProfileId();
        setProfileId(id);

        let row = null;
        if (id) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id,email,full_name,username,avatar_url,target_language,native_language,placement_level,initial_assessment_date,last_active_at,created_at')
            .eq('id', id)
            .limit(1);
          if (error && error.code !== 'PGRST116') throw error;
          row = Array.isArray(data) ? data[0] : data;
        }

        // Fallback by user_id if needed
        if (!row && user?.id) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id,email,full_name,username,avatar_url,target_language,native_language,placement_level,initial_assessment_date,last_active_at,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1);
          if (error && error.code !== 'PGRST116') throw error;
          row = Array.isArray(data) ? data[0] : data;
          if (row?.id) setProfileId(row.id);
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

        // Recent sessions
        if (user?.id) {
          const { success, data } = await supabaseService.getUserSessions(user.id, 5);
          if (success) setSessions(data);
        }
      } catch (err) {
        console.warn('Profile load error:', err);
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        full_name: form.full_name || null,
        username: form.username || null,
        target_language: form.target_language || null,
        native_language: form.native_language || null,
        placement_level: form.placement_level || null,
        avatar_url: form.avatar_url || null,
        updated_at: new Date().toISOString()
      };

      let query = supabase.from('user_profiles').update(payload);
      if (profileId) query = query.eq('id', profileId);
      else if (user?.id) query = query.eq('user_id', user.id);

      const { error } = await query.select().single();
      if (error) throw error;
    } catch (err) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const result = await supabaseStorageService.uploadFile(
        file,
        'shared-resources',
        'avatars',
        { contentType: file.type }
      );
      setForm(prev => ({ ...prev, avatar_url: result.url }));
      // Auto-save avatar URL
      await supabase
        .from('user_profiles')
        .update({ avatar_url: result.url, updated_at: new Date().toISOString() })
        .eq(profileId ? 'id' : 'user_id', profileId || user.id);
    } catch (err) {
      setError(err?.message || 'Failed to upload avatar');
    } finally {
      setSaving(false);
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

        {loading ? (
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
              </div>
              <div className="flex-1">
                <div className="text-xl font-semibold">{form.full_name || 'User'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{form.email}</div>
              </div>
              <div>
                <label className="cursor-pointer text-sm px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                  Upload Avatar
                  <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
                </label>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Current Level" value={`Level ${level}`} accent="bg-gradient-to-r from-indigo-700 to-fuchsia-700" />
              <StatCard title="Total XP" value={`${(totalXP || 0).toLocaleString()} XP`} accent="bg-gradient-to-r from-purple-700 to-pink-700" />
              <StatCard title="Active Streak" value={`${streak} days`} accent="bg-gradient-to-r from-emerald-700 to-teal-700" />
            </div>

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
                  <Input name="username" value={form.username} onChange={onChange} placeholder="username" />
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
                <div>
                  <Label>Placement Level (CEFR)</Label>
                  <Select name="placement_level" value={form.placement_level} onChange={onChange}>
                    {['','A1','A2','B1','B2','C1','C2'].map(l => (
                      <option key={l} value={l}>{l || '-'}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
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