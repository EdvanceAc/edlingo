-- Update lesson_materials type constraint to include image and audio types
-- This allows proper storage of image materials uploaded through the admin dashboard

-- Drop the existing constraint
ALTER TABLE public.lesson_materials DROP CONSTRAINT IF EXISTS lesson_materials_type_check;

-- Add updated constraint that includes 'image' and 'audio' types
ALTER TABLE public.lesson_materials 
ADD CONSTRAINT lesson_materials_type_check 
CHECK (type IN ('podcast', 'video', 'text', 'quiz', 'pdf', 'image', 'audio', 'interactive'));

-- Add comment explaining the types
COMMENT ON COLUMN public.lesson_materials.type IS 'Type of lesson material: text, image, audio, video, pdf, quiz, podcast, or interactive';