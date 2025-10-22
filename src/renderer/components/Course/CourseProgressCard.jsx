import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { BookOpen, Trophy, Star, Sparkles } from 'lucide-react';

const clampPct = (value) => Math.max(0, Math.min(100, Math.round(value)));

const getEasingFn = (name) => {
  switch (name) {
    case 'linear':
      return (t) => t;
    case 'easeInOutCubic':
      return (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    case 'easeOutQuad':
    default:
      return (t) => 1 - Math.pow(1 - t, 2);
  }
};
const getCssEasing = (name) => {
  switch (name) {
    case 'linear':
      return 'linear';
    case 'easeInOutCubic':
      return 'cubic-bezier(0.65, 0, 0.35, 1)';
    case 'easeOutQuad':
    default:
      return 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }
};

const CourseProgressCard = ({
  streak = 0,
  totalXP = 0,
  nextLevelXP = 100,
  title = 'Course Progress',
  subtitle = 'Continue your language learning journey',
  animationDurationMs = 600,
  easing = 'easeOutQuad',
}) => {
  const overallPct = clampPct((totalXP / nextLevelXP) * 100);
  const remainingXP = Math.max(nextLevelXP - totalXP, 0);

  // XP counter animation
  const [animatedXP, setAnimatedXP] = useState(totalXP);
  const prevXPRef = useRef(totalXP);

  // Glow overlays
  const [levelUpGlow, setLevelUpGlow] = useState(false);
  const [decreaseGlow, setDecreaseGlow] = useState(false);

  // Sparkle near completion
  const [sparkleActive, setSparkleActive] = useState(false);

  useEffect(() => {
    const start = prevXPRef.current;
    const end = totalXP;
    const direction = end - start;
    const duration = animationDurationMs;
    const easeFn = getEasingFn(easing);
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const value = Math.round(start + (end - start) * easeFn(t));
      setAnimatedXP(value);
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    // Glow & toast conditions
    if (start < nextLevelXP && end >= nextLevelXP) {
      setLevelUpGlow(true);
      toast.success('Level Up!', {
        duration: 2600,
        icon: '✨',
        style: {
          backdropFilter: 'blur(8px)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.14)',
        },
      });
      const t1 = setTimeout(() => setLevelUpGlow(false), 1600);
      prevXPRef.current = end;
      return () => clearTimeout(t1);
    }

    if (direction < 0) {
      setDecreaseGlow(true);
      const t = setTimeout(() => setDecreaseGlow(false), 800);
      prevXPRef.current = end;
      return () => clearTimeout(t);
    }

    prevXPRef.current = end;
  }, [totalXP, nextLevelXP, animationDurationMs, easing]);

  useEffect(() => {
    if (overallPct >= 95 && overallPct < 100) {
      setSparkleActive(true);
      const t = setTimeout(() => setSparkleActive(false), 900);
      return () => clearTimeout(t);
    }
  }, [overallPct]);

  const cssEasing = getCssEasing(easing);
  const progressBarColor = decreaseGlow ? 'bg-red-500' : 'bg-primary';

  return (
    <div>
      <Card className="card card-premium relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl ring-1 ring-white/10 shadow-soft">
        {/* decorative glow */}
        {levelUpGlow && (
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-yellow-300/60 animate-pulse" />
        )}
        {decreaseGlow && (
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-red-400/60 animate-pulse" />
        )}
        <div className="pointer-events-none absolute -top-10 -left-10 w-52 h-52 rounded-full bg-primary/20 blur-2xl" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            {/* Left: title and icon */}
            <div className="flex items-center gap-3">
              <div className="glass-dark p-3 rounded-xl shadow-soft">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            {/* Right: badges */}
            <div className="flex items-center gap-3">
              <Badge variant="chip" className="badge-chip chip-streak px-3 py-1 text-xs">
                <Trophy className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-300 mr-1" />
                {streak} day streak
              </Badge>
              <Badge variant="chip" className="badge-chip chip-xp px-3 py-1 text-xs">
                <Star className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300 mr-1" />
                {animatedXP}/{nextLevelXP} XP
              </Badge>
            </div>
          </div>

          {/* Premium progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{overallPct}%</span>
            </div>
            <div className="progress-modern relative">
              <div
                className={`progress-modern-bar ${progressBarColor}`}
                style={{ width: `${overallPct}%`, transition: `width ${animationDurationMs}ms ${cssEasing}` }}
              />
              {sparkleActive && (
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `calc(${overallPct}% - 10px)` }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <Sparkles className="w-5 h-5 text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.75)]" />
                </motion.div>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {remainingXP} XP until next level
            </div>
          </div>
        </CardContent>
      </Card>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default CourseProgressCard;