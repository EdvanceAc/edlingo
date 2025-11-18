-- Create a function to handle user profile creation with proper RLS bypass
-- This function should be run in Supabase SQL editor

CREATE OR REPLACE FUNCTION public.create_missing_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Insert the user profile with proper error handling
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name,
    preferred_language,
    target_languages,
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
    'beginner',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    updated_at = NOW()
  RETURNING to_json(user_profiles.*) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_missing_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- Also update the RLS policy to be more permissive for authenticated users
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Add a policy for the SECURITY DEFINER function
DROP POLICY IF EXISTS "Allow function to create profiles" ON public.user_profiles;
CREATE POLICY "Allow function to create profiles" ON public.user_profiles
  FOR ALL USING (
    auth.uid() = id OR 
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

COMMIT;