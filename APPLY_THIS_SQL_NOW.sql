-- ============================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE
-- ============================================
-- This fixes the RLS error you're seeing:
-- "new row violates row-level security policy for table user_progress"
-- ============================================

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Step 2: Create new policies that allow progress tracking
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" ON public.user_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own progress" ON public.user_progress
    FOR DELETE
    USING (user_id = auth.uid());

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;

-- ============================================
-- Also fix user_course_enrollments
-- ============================================

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.user_course_enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.user_course_enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.user_course_enrollments;

CREATE POLICY "Users can view own enrollments" ON public.user_course_enrollments
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own enrollments" ON public.user_course_enrollments
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own enrollments" ON public.user_course_enrollments
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.user_course_enrollments TO authenticated;

-- ============================================
-- Create user_activities table if it doesn't exist
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}'::jsonb,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;

CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activities" ON public.user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON public.user_activities TO authenticated;

-- ============================================
-- DONE! After running this SQL:
-- 1. Close the SQL Editor
-- 2. Go back to your app
-- 3. Hard refresh (Ctrl+Shift+R)
-- 4. Test Live Conversation - the error should be gone!
-- ============================================
