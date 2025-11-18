-- Fix missing columns in user_profiles table
-- This script should be run directly against the PostgreSQL database

-- Check current columns
\d public.user_profiles;

-- Add missing columns if they don't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS native_language TEXT DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS initial_assessment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS placement_level TEXT;

-- Update existing records to have default values
UPDATE public.user_profiles 
SET 
    assessment_completed = COALESCE(assessment_completed, false),
    target_language = COALESCE(target_language, 'English'),
    native_language = COALESCE(native_language, 'Unknown')
WHERE assessment_completed IS NULL OR target_language IS NULL OR native_language IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_assessment_completed ON public.user_profiles(assessment_completed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_target_language ON public.user_profiles(target_language);

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN public.user_profiles.assessment_completed IS 'Indicates whether the user has completed the initial language proficiency assessment';
COMMENT ON COLUMN public.user_profiles.target_language IS 'The language the user wants to learn';
COMMENT ON COLUMN public.user_profiles.native_language IS 'The user''s native/primary language';
COMMENT ON COLUMN public.user_profiles.initial_assessment_date IS 'Date when the user completed their initial assessment';
COMMENT ON COLUMN public.user_profiles.placement_level IS 'CEFR level determined by the initial assessment';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the columns exist
\d public.user_profiles;

-- Test a simple select
SELECT id, assessment_completed, target_language, native_language 
FROM public.user_profiles 
LIMIT 1;