-- Add cefrLevel column to user_progress table to fix missing column error

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS cefr_level TEXT DEFAULT 'A1';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_cefr_level ON public.user_progress(cefr_level);

-- Add comment for documentation
COMMENT ON COLUMN public.user_progress.cefr_level IS 'User''s current CEFR level';