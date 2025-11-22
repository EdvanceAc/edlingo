-- Migration: Add missing gamification columns to user_progress table
-- These columns are used by the Dashboard to display dynamic user progress

-- Add daily_goal column (in minutes)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 30;

-- Add daily_progress column (in minutes)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS daily_progress INTEGER DEFAULT 0;

-- Add pronunciation_accuracy column (percentage 0-100)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;

-- Rename total_lessons_completed to lessons_completed for consistency
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0;

-- Sync data from old column to new column if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_progress' 
        AND column_name = 'total_lessons_completed'
    ) THEN
        UPDATE public.user_progress 
        SET lessons_completed = COALESCE(total_lessons_completed, 0)
        WHERE lessons_completed = 0 OR lessons_completed IS NULL;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.user_progress.daily_goal IS 'Daily learning goal in minutes (default: 30)';
COMMENT ON COLUMN public.user_progress.daily_progress IS 'Daily progress towards goal in minutes';
COMMENT ON COLUMN public.user_progress.pronunciation_accuracy IS 'Pronunciation accuracy percentage (0-100)';
COMMENT ON COLUMN public.user_progress.lessons_completed IS 'Total number of lessons completed';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_progress_daily_goal ON public.user_progress(daily_goal);
CREATE INDEX IF NOT EXISTS idx_user_progress_daily_progress ON public.user_progress(daily_progress);
CREATE INDEX IF NOT EXISTS idx_user_progress_pronunciation_accuracy ON public.user_progress(pronunciation_accuracy);
CREATE INDEX IF NOT EXISTS idx_user_progress_lessons_completed ON public.user_progress(lessons_completed);

-- Add constraints to ensure data integrity
ALTER TABLE public.user_progress 
ADD CONSTRAINT IF NOT EXISTS check_daily_goal_positive CHECK (daily_goal > 0);

ALTER TABLE public.user_progress 
ADD CONSTRAINT IF NOT EXISTS check_daily_progress_non_negative CHECK (daily_progress >= 0);

ALTER TABLE public.user_progress 
ADD CONSTRAINT IF NOT EXISTS check_pronunciation_accuracy_range CHECK (pronunciation_accuracy >= 0 AND pronunciation_accuracy <= 100);
