-- Fix RLS policies for user_progress to allow progress tracking

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Create comprehensive policies that work with auth.uid()
-- SELECT policy
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT policy - allows creating progress for authenticated user
CREATE POLICY "Users can insert own progress" ON public.user_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE policy - allows updating own progress
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE policy (optional, for cleanup)
CREATE POLICY "Users can delete own progress" ON public.user_progress
    FOR DELETE
    USING (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT USAGE ON SEQUENCE user_progress_id_seq TO authenticated;

-- Also fix user_course_enrollments for course progress tracking
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.user_course_enrollments;
DROP POLICY IF EXISTS "Users can upsert own enrollments" ON public.user_course_enrollments;
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

-- Grant permissions for enrollments
GRANT SELECT, INSERT, UPDATE ON public.user_course_enrollments TO authenticated;

COMMENT ON POLICY "Users can view own progress" ON public.user_progress IS 'Allows users to read their own progress data';
COMMENT ON POLICY "Users can insert own progress" ON public.user_progress IS 'Allows users to create their own progress records';
COMMENT ON POLICY "Users can update own progress" ON public.user_progress IS 'Allows users to update their own progress';
