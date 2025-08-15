-- Update lessons table to match comprehensive schema from migration 014
-- This aligns the lessons table with the extended schema expected by the application

-- First, add missing columns to existing lessons table if they don't exist
DO $$
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'title') THEN
        ALTER TABLE public.lessons ADD COLUMN title TEXT;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'description') THEN
        ALTER TABLE public.lessons ADD COLUMN description TEXT;
    END IF;
    
    -- Add lesson_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'lesson_type') THEN
        ALTER TABLE public.lessons ADD COLUMN lesson_type TEXT DEFAULT 'vocabulary' CHECK (lesson_type IN ('vocabulary', 'grammar', 'conversation', 'listening', 'reading', 'writing', 'speaking'));
    END IF;
    
    -- Add order_index column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'order_index') THEN
        ALTER TABLE public.lessons ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    
    -- Add duration_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'duration_minutes') THEN
        ALTER TABLE public.lessons ADD COLUMN duration_minutes INTEGER DEFAULT 15;
    END IF;
    
    -- Add difficulty_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'difficulty_level') THEN
        ALTER TABLE public.lessons ADD COLUMN difficulty_level TEXT DEFAULT 'beginner';
    END IF;
    
    -- Add learning_objectives column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'learning_objectives') THEN
        ALTER TABLE public.lessons ADD COLUMN learning_objectives TEXT[];
    END IF;
    
    -- Add is_published column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published BOOLEAN DEFAULT false;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'created_at') THEN
        ALTER TABLE public.lessons ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'updated_at') THEN
        ALTER TABLE public.lessons ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add course_id column if it doesn't exist (for direct course lessons)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'course_id') THEN
        ALTER TABLE public.lessons ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
    END IF;
    
    -- Add order_number column if it doesn't exist (for compatibility with existing code)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'order_number') THEN
        ALTER TABLE public.lessons ADD COLUMN order_number INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing lessons to populate title from name if title is null
UPDATE public.lessons 
SET title = name 
WHERE title IS NULL AND name IS NOT NULL;

-- Update existing lessons to set default values for new columns
UPDATE public.lessons 
SET 
    lesson_type = COALESCE(lesson_type, 'vocabulary'),
    order_index = COALESCE(order_index, 0),
    order_number = COALESCE(order_number, 0),
    duration_minutes = COALESCE(duration_minutes, 15),
    difficulty_level = COALESCE(difficulty_level, 'beginner'),
    learning_objectives = COALESCE(learning_objectives, ARRAY[]::TEXT[]),
    is_published = COALESCE(is_published, false),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id_direct ON public.lessons(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_term_id_existing ON public.lessons(term_id) WHERE term_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON public.lessons(order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_order_number ON public.lessons(order_number);
CREATE INDEX IF NOT EXISTS idx_lessons_is_published ON public.lessons(is_published);

-- Add helpful comments
COMMENT ON TABLE public.lessons IS 'Lessons table with comprehensive schema supporting both term-based and direct course lessons';
COMMENT ON COLUMN public.lessons.course_id IS 'Direct reference to course (alternative to term_id)';
COMMENT ON COLUMN public.lessons.term_id IS 'Reference to term (legacy structure)';
COMMENT ON COLUMN public.lessons.title IS 'Display title for the lesson';
COMMENT ON COLUMN public.lessons.name IS 'Internal name for the lesson (legacy)';
COMMENT ON COLUMN public.lessons.order_index IS 'Ordering within course (primary)';
COMMENT ON COLUMN public.lessons.order_number IS 'Ordering within term (legacy)';