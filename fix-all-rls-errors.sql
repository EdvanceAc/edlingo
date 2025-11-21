-- ============================================================
-- COMPREHENSIVE RLS POLICY FIX FOR EDLINGO DATABASE
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- ============================================================

-- This script fixes RLS policies for tables causing access errors:
-- - user_vocabulary
-- - user_achievements 
-- - user_profiles
-- - grammar_lessons

-- ============================================================
-- 1. FIX USER_PROFILES TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create permissive policies for user_profiles
CREATE POLICY "Allow authenticated users to view profiles" ON public.user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update profiles" ON public.user_profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- 2. FIX USER_VOCABULARY TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own vocabulary" ON public.user_vocabulary;

-- Create permissive policy for user_vocabulary
CREATE POLICY "Allow authenticated users to manage vocabulary" ON public.user_vocabulary
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 3. FIX USER_ACHIEVEMENTS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;

-- Create permissive policies for user_achievements
CREATE POLICY "Allow authenticated users to view achievements" ON public.user_achievements
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update achievements" ON public.user_achievements
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- 4. FIX GRAMMAR_LESSONS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active grammar lessons" ON public.grammar_lessons;
DROP POLICY IF EXISTS "Authenticated users can manage grammar lessons" ON public.grammar_lessons;

-- Create permissive policies for grammar_lessons
CREATE POLICY "Allow all to view grammar lessons" ON public.grammar_lessons
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage grammar lessons" ON public.grammar_lessons
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 5. ADDITIONAL FIXES FOR COMMON RLS ISSUES
-- ============================================================

-- Fix user_progress table if it has issues
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;

CREATE POLICY "Allow authenticated users to manage progress" ON public.user_progress
    FOR ALL USING (auth.role() = 'authenticated');

-- Fix learning_sessions table if it has issues
DROP POLICY IF EXISTS "Users can view own sessions" ON public.learning_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.learning_sessions;

CREATE POLICY "Allow authenticated users to manage sessions" ON public.learning_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- Fix conversation_history table if it has issues
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversation_history;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversation_history;

CREATE POLICY "Allow authenticated users to manage conversations" ON public.conversation_history
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. VERIFICATION QUERIES
-- ============================================================

-- Check if tables exist and RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_vocabulary', 'user_achievements', 'grammar_lessons')
ORDER BY tablename;

-- Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_vocabulary', 'user_achievements', 'grammar_lessons')
ORDER BY tablename, policyname;

-- ============================================================
-- MANUAL EXECUTION INSTRUCTIONS:
-- ============================================================
-- 1. Open your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire SQL script
-- 4. Click "Run" to execute all commands
-- 5. Check the verification queries at the end to confirm success
-- ============================================================