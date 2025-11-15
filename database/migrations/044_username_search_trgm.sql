-- Enable trigram search on usernames for fast ILIKE/partial matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS gin_user_profiles_username_trgm
ON public.user_profiles
USING gin (username gin_trgm_ops);

COMMIT;

