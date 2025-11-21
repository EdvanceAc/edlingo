-- ============================================================
-- SUPABASE SCHEMA FIX FOR EDLINGO
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: Add missing last_study_date column to user_progress
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS last_study_date DATE DEFAULT CURRENT_DATE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_last_study_date 
ON public.user_progress(last_study_date);

-- Add comment
COMMENT ON COLUMN public.user_progress.last_study_date 
IS 'Date of the user''s last study session';

-- Step 2: Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'general'
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for notifications
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- Create new policies
CREATE POLICY "Users can view own notifications" 
ON public.notifications
FOR SELECT 
USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own notifications" 
ON public.notifications
FOR INSERT 
WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications" 
ON public.notifications
FOR UPDATE 
USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own notifications" 
ON public.notifications
FOR DELETE 
USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Step 4: Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON public.notifications(is_read);

-- Step 5: Add comments
COMMENT ON TABLE public.notifications 
IS 'User notifications with foreign key to user_profiles';

COMMENT ON COLUMN public.notifications.user_id 
IS 'Reference to user_profiles.id';

COMMENT ON COLUMN public.notifications.content 
IS 'Notification message content';

COMMENT ON COLUMN public.notifications.type 
IS 'Notification type: general, achievement, reminder, etc.';

-- Step 6: Ensure user_progress table has proper structure
-- Add any missing columns that might cause 400/406 errors
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;

-- Step 7: Update any existing records to have default values
UPDATE public.user_progress 
SET last_study_date = CURRENT_DATE 
WHERE last_study_date IS NULL;

UPDATE public.user_progress 
SET current_level = 1 
WHERE current_level IS NULL;

UPDATE public.user_progress 
SET total_xp = 0 
WHERE total_xp IS NULL;

UPDATE public.user_progress 
SET daily_streak = 0 
WHERE daily_streak IS NULL;

-- Step 8: Refresh schema cache (this will be done automatically after execution)
-- The PostgREST cache will be refreshed when you execute this SQL

-- ============================================================
-- VERIFICATION QUERIES (Run these after the above to verify)
-- ============================================================

-- Check if last_study_date column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
AND column_name = 'last_study_date';

-- Check if notifications table exists
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name = 'notifications' 
AND table_schema = 'public';

-- Check notifications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test queries that were failing
SELECT id, user_id, last_study_date 
FROM public.user_progress 
LIMIT 1;

SELECT id, user_id, content, created_at, is_read, type 
FROM public.notifications 
LIMIT 1;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- If all queries above execute without errors, the schema fixes are complete!
-- You can now restart your application and the Supabase connectivity issues should be resolved.