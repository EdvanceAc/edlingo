import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { BookOpen, Trophy, Star } from 'lucide-react';

const clampPct = (value) => Math.max(0, Math.min(100, Math.round(value)));

const CourseProgressCard = ({
  streak = 0,
  totalXP = 0,
  nextLevelXP = 100,
  title = 'Course Progress',
  subtitle = 'Continue your language learning journey',
}) => {
  const overallPct = clampPct((totalXP / nextLevelXP) * 100);
  const remainingXP = Math.max(nextLevelXP - totalXP, 0);

  return (
    <Card className="card card-premium relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl ring-1 ring-white/10 shadow-soft">
      {/* decorative glow */}
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
              {totalXP}/{nextLevelXP} XP
            </Badge>
          </div>
        </div>

        {/* Premium progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{overallPct}%</span>
          </div>
          <div className="progress-modern">
            <div className="progress-modern-bar bg-primary" style={{ width: `${overallPct}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {remainingXP} XP until next level
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseProgressCard;