-- Fix user_progress table column names to match admin dashboard expectations
-- Migration to align database schema with frontend expectations

-- Add new columns with expected names
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_level TEXT,
ADD COLUMN IF NOT EXISTS total_xp INTEGER,
ADD COLUMN IF NOT EXISTS daily_streak INTEGER;

-- Update new columns with data from existing columns
UPDATE public.user_progress 
SET 
    current_level = level,
    total_xp = xp_points,
    daily_streak = streak_days
WHERE current_level IS NULL OR total_xp IS NULL OR daily_streak IS NULL;

-- Set default values for new columns
ALTER TABLE public.user_progress 
ALTER COLUMN current_level SET DEFAULT 'beginner',
ALTER COLUMN total_xp SET DEFAULT 0,
ALTER COLUMN daily_streak SET DEFAULT 0;

-- Add NOT NULL constraints
ALTER TABLE public.user_progress 
ALTER COLUMN current_level SET NOT NULL,
ALTER COLUMN total_xp SET NOT NULL,
ALTER COLUMN daily_streak SET NOT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_user_progress_current_level ON public.user_progress(current_level);
CREATE INDEX IF NOT EXISTS idx_user_progress_total_xp ON public.user_progress(total_xp);
CREATE INDEX IF NOT EXISTS idx_user_progress_daily_streak ON public.user_progress(daily_streak);

-- Create a trigger to keep the columns synchronized
CREATE OR REPLACE FUNCTION sync_user_progress_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync from old columns to new columns
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        NEW.current_level = COALESCE(NEW.current_level, NEW.level, 'beginner');
        NEW.total_xp = COALESCE(NEW.total_xp, NEW.xp_points, 0);
        NEW.daily_streak = COALESCE(NEW.daily_streak, NEW.streak_days, 0);
        
        -- Also sync back to maintain consistency
        NEW.level = NEW.current_level;
        NEW.xp_points = NEW.total_xp;
        NEW.streak_days = NEW.daily_streak;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_user_progress_trigger ON public.user_progress;
CREATE TRIGGER sync_user_progress_trigger
    BEFORE INSERT OR UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION sync_user_progress_columns();

-- Add foreign key constraint from user_progress to user_profiles
-- This will help PostgREST understand the relationship
ALTER TABLE public.user_progress 
ADD CONSTRAINT fk_user_progress_user_profiles 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Comment on the table to document the relationship
COMMENT ON TABLE public.user_progress IS 'User learning progress tracking with foreign key to user_profiles';
COMMENT ON COLUMN public.user_progress.user_id IS 'References user_profiles.id for PostgREST relationship detection';