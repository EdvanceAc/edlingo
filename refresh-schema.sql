-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative method to force schema reload
SELECT pg_notify('pgrst', 'reload schema');