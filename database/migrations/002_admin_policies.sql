-- Admin Dashboard Policies
-- This migration adds policies to allow admin dashboard functionality

-- Create admin role check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, we'll use a simple check based on email domain
    -- In production, you should have a proper admin role system
    RETURN (
        auth.jwt() ->> 'email' LIKE '%@admin.edlingo.com' OR
        auth.jwt() ->> 'email' = 'admin@example.com' OR
        auth.jwt() ->> 'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies for user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (public.is_admin());

-- Add admin policies for user_progress
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
CREATE POLICY "Admins can view all progress" ON public.user_progress
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all progress" ON public.user_progress;
CREATE POLICY "Admins can manage all progress" ON public.user_progress
    FOR ALL USING (public.is_admin());

-- Add admin policies for user_vocabulary
DROP POLICY IF EXISTS "Admins can view all vocabulary" ON public.user_vocabulary;
CREATE POLICY "Admins can view all vocabulary" ON public.user_vocabulary
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all vocabulary" ON public.user_vocabulary;
CREATE POLICY "Admins can manage all vocabulary" ON public.user_vocabulary
    FOR ALL USING (public.is_admin());

-- Add admin policies for user_achievements
DROP POLICY IF EXISTS "Admins can view all achievements" ON public.user_achievements;
CREATE POLICY "Admins can view all achievements" ON public.user_achievements
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all achievements" ON public.user_achievements;
CREATE POLICY "Admins can manage all achievements" ON public.user_achievements
    FOR ALL USING (public.is_admin());

-- Add admin policies for learning_sessions
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.learning_sessions;
CREATE POLICY "Admins can view all sessions" ON public.learning_sessions
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.learning_sessions;
CREATE POLICY "Admins can manage all sessions" ON public.learning_sessions
    FOR ALL USING (public.is_admin());

-- Add admin policies for conversation_history
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversation_history;
CREATE POLICY "Admins can view all conversations" ON public.conversation_history
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all conversations" ON public.conversation_history;
CREATE POLICY "Admins can manage all conversations" ON public.conversation_history
    FOR ALL USING (public.is_admin());

-- Update courses policies for admin access
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (public.is_admin());

-- Update assignments policies for admin access
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;
CREATE POLICY "Admins can manage all assignments" ON public.assignments
    FOR ALL USING (public.is_admin());

-- Create a simple way to bypass RLS for service role
-- Note: This should only be used with service role key, not anon key
DROP POLICY IF EXISTS "Service role bypass" ON public.user_profiles;
CREATE POLICY "Service role bypass" ON public.user_profiles
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass progress" ON public.user_progress;
CREATE POLICY "Service role bypass progress" ON public.user_progress
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass vocabulary" ON public.user_vocabulary;
CREATE POLICY "Service role bypass vocabulary" ON public.user_vocabulary
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass achievements" ON public.user_achievements;
CREATE POLICY "Service role bypass achievements" ON public.user_achievements
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass sessions" ON public.learning_sessions;
CREATE POLICY "Service role bypass sessions" ON public.learning_sessions
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass conversations" ON public.conversation_history;
CREATE POLICY "Service role bypass conversations" ON public.conversation_history
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass courses" ON public.courses;
CREATE POLICY "Service role bypass courses" ON public.courses
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass assignments" ON public.assignments;
CREATE POLICY "Service role bypass assignments" ON public.assignments
    FOR ALL USING (auth.role() = 'service_role');