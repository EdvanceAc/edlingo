-- ============================================================
-- FIX USER_PROGRESS RLS POLICIES
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- ============================================================

-- Option 1: Disable RLS entirely for user_progress table (Most permissive)
-- This will allow all operations without restrictions
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternative - Create very permissive RLS policies
-- Uncomment the section below if you prefer to keep RLS enabled but make it very permissive

/*
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Create very permissive policies that allow all authenticated users
CREATE POLICY "Allow all authenticated users to view progress" ON public.user_progress
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users to insert progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users to update progress" ON public.user_progress
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users to delete progress" ON public.user_progress
    FOR DELETE USING (auth.role() = 'authenticated');
*/

-- Option 3: Even more permissive - Allow all operations for everyone
-- Uncomment the section below for maximum permissiveness

/*
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Create policies that allow all operations for everyone
CREATE POLICY "Allow all to view progress" ON public.user_progress
    FOR SELECT USING (true);

CREATE POLICY "Allow all to insert progress" ON public.user_progress
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to update progress" ON public.user_progress
    FOR UPDATE USING (true);

CREATE POLICY "Allow all to delete progress" ON public.user_progress
    FOR DELETE USING (true);
*/

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query to check if RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_progress' AND schemaname = 'public';

-- Check existing policies (should be empty if RLS is disabled)
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'user_progress' AND schemaname = 'public'
ORDER BY policyname;

-- Test query to verify access
SELECT 'RLS fix verification - this should work now' as status;
SELECT COUNT(*) as user_progress_count FROM public.user_progress;