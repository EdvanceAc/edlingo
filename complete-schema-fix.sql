-- Complete Database Schema Fix for EdLingo
-- This script adds all missing columns identified in the verification report
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================================
-- CRITICAL MISSING COLUMNS FIX
-- ============================================================

-- 1. Add lessons_completed to user_progress (CRITICAL - causing test failures)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0;

-- Add index and comment
CREATE INDEX IF NOT EXISTS idx_user_progress_lessons_completed ON public.user_progress(lessons_completed);
COMMENT ON COLUMN public.user_progress.lessons_completed IS 'Number of lessons completed by the user';

-- 1.1. Add pronunciation_accuracy to user_progress (CRITICAL - causing ProgressProvider failures)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;

-- Add index and comment for pronunciation_accuracy
CREATE INDEX IF NOT EXISTS idx_user_progress_pronunciation_accuracy ON public.user_progress(pronunciation_accuracy);
COMMENT ON COLUMN public.user_progress.pronunciation_accuracy IS 'User pronunciation accuracy percentage (0.00-100.00)';

-- 2. Add user_id to user_profiles (if missing - for auth integration)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint and index
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
COMMENT ON COLUMN public.user_profiles.user_id IS 'Reference to auth.users table';

-- 3. Add difficulty_level to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner';

-- Add check constraint for valid difficulty levels
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_difficulty_level' 
        AND table_name = 'courses'
    ) THEN
        ALTER TABLE public.courses 
        ADD CONSTRAINT check_difficulty_level 
        CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
    END IF;
END $$;

-- Add index and comment
CREATE INDEX IF NOT EXISTS idx_courses_difficulty_level ON public.courses(difficulty_level);
COMMENT ON COLUMN public.courses.difficulty_level IS 'Course difficulty: beginner, intermediate, advanced, expert';

-- 4. Add missing columns to lessons table
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Add indexes and comments for lessons
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON public.lessons(order_index);
COMMENT ON COLUMN public.lessons.course_id IS 'Reference to the course this lesson belongs to';
COMMENT ON COLUMN public.lessons.content IS 'Lesson content in JSON or text format';
COMMENT ON COLUMN public.lessons.order_index IS 'Order of the lesson within the course';

-- ============================================================
-- UPDATE EXISTING DATA WITH DEFAULT VALUES
-- ============================================================

-- Update user_progress records with default values
UPDATE public.user_progress 
SET lessons_completed = 0 
WHERE lessons_completed IS NULL;

-- Update courses with default difficulty if null
UPDATE public.courses 
SET difficulty_level = 'beginner' 
WHERE difficulty_level IS NULL;

-- Update lessons with default order_index
UPDATE public.lessons 
SET order_index = 0 
WHERE order_index IS NULL;

-- ============================================================
-- ADDITIONAL SCHEMA IMPROVEMENTS
-- ============================================================

-- Ensure all tables have proper timestamps
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at trigger for lessons if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on lessons table
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lessons
DROP POLICY IF EXISTS "Public can view lessons" ON public.lessons;
CREATE POLICY "Public can view lessons" ON public.lessons
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON public.lessons;
CREATE POLICY "Authenticated users can manage lessons" ON public.lessons
    FOR ALL USING (auth.role() = 'authenticated');

-- Update user_progress RLS to handle lessons_completed
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (
        user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress" ON public.user_progress
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test the critical queries that were failing
SELECT 'Testing user_progress with lessons_completed' as test_name;
SELECT id, user_id, lessons_completed, last_study_date, current_level, total_xp, daily_streak
FROM public.user_progress 
LIMIT 1;

SELECT 'Testing courses with difficulty_level' as test_name;
SELECT id, title, description, language, difficulty_level, is_active
FROM public.courses 
LIMIT 1;

SELECT 'Testing lessons with all columns' as test_name;
SELECT id, course_id, title, content, order_index
FROM public.lessons 
LIMIT 1;

SELECT 'Testing notifications table' as test_name;
SELECT id, user_id, content, created_at, is_read, type
FROM public.notifications 
LIMIT 1;

-- ============================================================
-- SCHEMA VERIFICATION
-- ============================================================

-- Verify all critical columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('user_progress', 'courses', 'lessons', 'notifications', 'user_profiles')
AND column_name IN (
    'lessons_completed', 'difficulty_level', 'course_id', 'content', 'order_index', 
    'user_id', 'last_study_date', 'current_level', 'total_xp', 'daily_streak'
)
ORDER BY table_name, column_name;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT '✅ Complete schema fix applied successfully!' as status,
       'All missing columns have been added to the database.' as message,
       'You can now run the verification script to confirm.' as next_step;

-- ============================================================
-- REFRESH SCHEMA CACHE
-- ============================================================
-- PostgREST will automatically refresh the schema cache
-- No manual action needed - the changes will be available immediately

-- ============================================================
-- FINAL NOTES
-- ============================================================
-- This script addresses all critical issues found in the verification:
-- 1. ✅ Added lessons_completed to user_progress
-- 2. ✅ Added user_id to user_profiles (if missing)
-- 3. ✅ Added difficulty_level to courses
-- 4. ✅ Added course_id, content, order_index to lessons
-- 5. ✅ Updated RLS policies for proper access control
-- 6. ✅ Added proper indexes for performance
-- 7. ✅ Added constraints for data integrity
-- 8. ✅ Updated existing records with default values
--
-- After running this script:
-- - Run: node simple-schema-verification.js
-- - All tests should pass
-- - Course management testing can proceed
-- ============================================================