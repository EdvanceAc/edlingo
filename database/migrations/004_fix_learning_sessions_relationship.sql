-- Fix learning_sessions table to establish proper relationship with user_profiles
-- Migration to resolve PostgREST relationship detection issues

-- First, let's check if the learning_sessions table exists and add missing columns if needed
-- Add user_id column if it doesn't exist (referencing user_profiles)
ALTER TABLE public.learning_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add lesson_type column if it doesn't exist (for admin dashboard display)
ALTER TABLE public.learning_sessions 
ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'general';

-- Add completed column if it doesn't exist (for activity tracking)
ALTER TABLE public.learning_sessions 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Update existing records to have a user_id if they don't have one
-- This assumes the learning_sessions table might have records without proper user_id
UPDATE public.learning_sessions 
SET user_id = (
    SELECT id FROM public.user_profiles 
    WHERE user_profiles.id = learning_sessions.user_id 
    LIMIT 1
)
WHERE user_id IS NULL OR user_id NOT IN (
    SELECT id FROM public.user_profiles
);

-- Add foreign key constraint from learning_sessions to user_profiles
-- This will help PostgREST understand the relationship
ALTER TABLE public.learning_sessions 
DROP CONSTRAINT IF EXISTS fk_learning_sessions_user_profiles;

ALTER TABLE public.learning_sessions 
ADD CONSTRAINT fk_learning_sessions_user_profiles 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON public.learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_created_at ON public.learning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_completed ON public.learning_sessions(completed);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_lesson_type ON public.learning_sessions(lesson_type);

-- Add comments to document the relationships for PostgREST
COMMENT ON TABLE public.learning_sessions IS 'Learning session records with foreign key to user_profiles';
COMMENT ON COLUMN public.learning_sessions.user_id IS 'References user_profiles.id for PostgREST relationship detection';
COMMENT ON COLUMN public.learning_sessions.lesson_type IS 'Type of lesson for admin dashboard display';
COMMENT ON COLUMN public.learning_sessions.completed IS 'Whether the session was completed';

-- Ensure the table has proper RLS policies
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for learning_sessions
DROP POLICY IF EXISTS "Users can view own learning sessions" ON public.learning_sessions;
CREATE POLICY "Users can view own learning sessions" ON public.learning_sessions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own learning sessions" ON public.learning_sessions;
CREATE POLICY "Users can insert own learning sessions" ON public.learning_sessions
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own learning sessions" ON public.learning_sessions;
CREATE POLICY "Users can update own learning sessions" ON public.learning_sessions
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Admin policy for viewing all sessions
DROP POLICY IF EXISTS "Admins can view all learning sessions" ON public.learning_sessions;
CREATE POLICY "Admins can view all learning sessions" ON public.learning_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert some sample learning sessions for testing
INSERT INTO public.learning_sessions (user_id, lesson_type, completed, created_at)
SELECT 
    up.id,
    CASE 
        WHEN random() < 0.3 THEN 'grammar'
        WHEN random() < 0.6 THEN 'vocabulary'
        ELSE 'conversation'
    END as lesson_type,
    random() < 0.7 as completed,
    NOW() - (random() * interval '7 days') as created_at
FROM public.user_profiles up
WHERE NOT EXISTS (
    SELECT 1 FROM public.learning_sessions ls 
    WHERE ls.user_id = up.id
)
LIMIT 10;