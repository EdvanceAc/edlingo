-- Fix user profile creation RLS policy issue
-- Migration to ensure automatic user profile creation works properly

-- First, let's add a policy that allows the handle_new_user function to create profiles
-- This policy will allow inserts when the function is called with SECURITY DEFINER
DROP POLICY IF EXISTS "Allow automatic profile creation" ON public.user_profiles;
CREATE POLICY "Allow automatic profile creation" ON public.user_profiles
    FOR INSERT WITH CHECK (
        -- Allow if the current user ID matches the profile ID being created
        auth.uid() = id 
        OR 
        -- Allow if this is being called by the SECURITY DEFINER function
        current_setting('role', true) = 'postgres'
    );

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the user profile with proper error handling
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        preferred_language,
        target_languages,
        target_language,
        native_language,
        learning_level,
        assessment_completed,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'en',
        '{}',
        'English',
        'Unknown',
        'beginner',
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        target_language = COALESCE(EXCLUDED.target_language, user_profiles.target_language, 'English'),
        native_language = COALESCE(EXCLUDED.native_language, user_profiles.native_language, 'Unknown'),
        assessment_completed = COALESCE(EXCLUDED.assessment_completed, user_profiles.assessment_completed, false);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a function to manually create missing user profiles
CREATE OR REPLACE FUNCTION public.create_missing_user_profile(user_id UUID, user_email TEXT, user_name TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        preferred_language,
        target_languages,
        target_language,
        native_language,
        learning_level,
        assessment_completed,
        created_at,
        updated_at
    )
    VALUES (
        user_id, 
        user_email, 
        COALESCE(user_name, user_email),
        'en',
        '{}',
        'English',
        'Unknown',
        'beginner',
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        target_language = COALESCE(EXCLUDED.target_language, user_profiles.target_language, 'English'),
        native_language = COALESCE(EXCLUDED.native_language, user_profiles.native_language, 'Unknown'),
        assessment_completed = COALESCE(EXCLUDED.assessment_completed, user_profiles.assessment_completed, false);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user profile for %: %', user_id, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_missing_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

COMMIT;