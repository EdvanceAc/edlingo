-- Add file_type support to lessons table
-- Ensures only the allowed types: text, image, audio, video

-- 1) Create enum type if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'file_type_enum'
    ) THEN
        CREATE TYPE public.file_type_enum AS ENUM ('text', 'image', 'audio', 'video');
    END IF;
END
$$;

-- 2) Add column to lessons table if it does not exist
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS file_type public.file_type_enum;

-- 3) Add helpful comment
COMMENT ON COLUMN public.lessons.file_type IS 'Type of primary content for this lesson: text, image, audio, or video.';