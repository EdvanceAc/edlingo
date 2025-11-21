-- Fix missing columns causing lesson loading errors
-- Add order_number to lesson_materials and course_id to lessons

-- Add order_number column to lesson_materials table
ALTER TABLE public.lesson_materials 
ADD COLUMN IF NOT EXISTS order_number INTEGER DEFAULT 0;

-- Add course_id column to lessons table for direct course association
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_materials_order_number ON public.lesson_materials(order_number);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);

-- Add comments for documentation
COMMENT ON COLUMN public.lesson_materials.order_number IS 'Order of the material within the lesson';
COMMENT ON COLUMN public.lessons.course_id IS 'Direct reference to course (optional, can use term_id->course_id instead)';

-- Update existing lesson_materials to have sequential order numbers
WITH ordered_materials AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY created_at) as rn
  FROM public.lesson_materials
  WHERE order_number = 0 OR order_number IS NULL
)
UPDATE public.lesson_materials 
SET order_number = ordered_materials.rn
FROM ordered_materials 
WHERE public.lesson_materials.id = ordered_materials.id;

-- Update lessons to have course_id based on their term's course_id
UPDATE public.lessons 
SET course_id = t.course_id
FROM public.terms t 
WHERE public.lessons.term_id = t.id 
AND public.lessons.course_id IS NULL;