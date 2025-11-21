-- Add username to user_profiles with case-insensitive uniqueness and basic validation
-- Safe to run multiple times

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Enforce simple allowed pattern and length when provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_user_profiles_username_format'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT ck_user_profiles_username_format
      CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._]{3,32}$');
  END IF;
END;
$$;

-- Create a case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_profiles_username_ci
ON public.user_profiles (LOWER(username))
WHERE username IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.username IS 'Public handle; unique case-insensitively. Allowed: letters, numbers, dot, underscore (3–32 chars).';

-- Helpful index for direct lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (username);

COMMIT;

