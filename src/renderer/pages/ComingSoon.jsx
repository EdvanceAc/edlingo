import React from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import {
  Play,
  Mic,
  MessageCircle,
  GraduationCap,
  ChevronLeft,
  Rocket,
  Sparkles,
  Clock
} from 'lucide-react';

const featureConfigs = {
  'continue-learning': {
    title: 'Continue Learning',
    subtitle: 'Resume your last lesson',
    icon: Play,
    color: 'from-blue-500 to-blue-600',
    gradient: 'from-blue-500 via-indigo-500 to-purple-600'
  },
  'practice-speaking': {
    title: 'Practice Speaking',
    subtitle: 'Improve pronunciation',
    icon: Mic,
    color: 'from-green-500 to-green-600',
    gradient: 'from-green-500 via-emerald-500 to-teal-600'
  },
  'chat-practice': {
    title: 'Chat Practice',
    subtitle: 'Conversation with AI',
    icon: MessageCircle,
    color: 'from-purple-500 to-purple-600',
    gradient: 'from-purple-500 via-fuchsia-500 to-pink-600'
  },
  'grammar-exercises': {
    title: 'Grammar Exercises',
    subtitle: 'Master language rules',
    icon: GraduationCap,
    color: 'from-orange-500 to-orange-600',
    gradient: 'from-orange-500 via-amber-500 to-red-500'
  }
};

const ComingSoon = () => {
  const { feature } = useParams();
  const cfg = featureConfigs[feature] || {
    title: 'New Feature',
    subtitle: 'Exciting capabilities are on the way',
    icon: Rocket,
    color: 'from-cyan-500 to-blue-600',
    gradient: 'from-cyan-500 via-sky-500 to-blue-600'
  };

  const Icon = cfg.icon;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-28 -left-28 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-2xl" />

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-soft`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-white to-white bg-clip-text text-transparent drop-shadow-sm">
                {cfg.title}
              </h1>
              <p className="text-sm text-muted-foreground">{cfg.subtitle}</p>
            </div>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="rounded-xl p-6 bg-white/10 backdrop-blur-md border border-white/10"
            >
              <div className="flex items-center gap-3 mb-3">
                <Rocket className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Coming Soon</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                This section is under active development. We’re crafting a delightful, high-performing experience with rich interactions and smart guidance.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>ETA: rolling out in upcoming releases</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.16 }}
              className="rounded-xl p-6 bg-white/10 backdrop-blur-md border border-white/10"
            >
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Sneak Peek</h2>
              </div>
              <ul className="space-y-2 text-sm">
                <li>Polished UI with motion-driven feedback</li>
                <li>Personalized pathways aligned to your goals</li>
                <li>Progress tracking synced to your profile</li>
              </ul>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm transition-colors border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <div className={`px-3 py-1 rounded-md text-xs font-semibold text-white bg-gradient-to-r ${cfg.gradient} shadow-soft`}>
              {cfg.title} • Coming Soon
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ComingSoon;