import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Flame, Zap, Settings } from 'lucide-react';
import { useProgress } from '../../providers/ProgressProvider';
import { useNavigate } from 'react-router-dom';

export default function MobileMenu({ onClose }) {
  const { getProgressStats } = useProgress();
  const stats = getProgressStats();
  const navigate = useNavigate();

  const progressPercent = Math.max(0, Math.min(100, Math.round(stats.progressToNextLevel || 0)));

  return (
    <div className="fixed inset-0 z-[1000] md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Left Drawer */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[360px] rounded-r-2xl bg-white border-r border-gray-200 shadow-2xl overflow-y-auto"
      >
        {/* Drawer Header with hamburger as part of drawer */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close mobile menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-medium">Menu</span>
          </button>
          <div className="text-sm font-semibold">EdLingo</div>
        </div>

        {/* Progress Overview Card */}
        <div className="px-4 pt-4 pb-2">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 ring-1 ring-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400/90 text-white flex items-center justify-center shadow">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-base">Level {stats?.level ?? 0}</div>
                  <div className="text-xs text-gray-500">{stats?.xp ?? 0} XP</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">{stats?.streak ?? 0}</span>
                <span className="text-xs text-gray-500">day streak</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {typeof stats?.xpToNextLevel === 'number' && (
                <div className="mt-2 text-[11px] text-gray-500">
                  {stats.xpToNextLevel} XP to next level
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 pb-6">
          <div className="px-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => { onClose?.(); navigate('/settings'); }}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div className="text-sm font-medium">Settings</div>
            </button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}