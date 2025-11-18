-- Align lessons table schema to match upsert function expectations
-- This migration fixes the schema mismatch between migrations 016 and 021

-- First, let's check if we need to modify the existing lessons table
-- Drop the old lessons table if it exists with the wrong schema
DROP TABLE IF EXISTS public.lessons CASCADE;

-- Create the lessons table with the correct schema expected by upsert function
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  order_number INTEGER DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'A1' CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  required_xp INTEGER DEFAULT 0,
  prerequisites JSONB,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_term_id ON public.lessons(term_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_number ON public.lessons(order_number);
CREATE INDEX IF NOT EXISTS idx_lessons_level ON public.lessons(level);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
CREATE POLICY "Anyone can view lessons" ON public.lessons
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON public.lessons;
CREATE POLICY "Authenticated users can manage lessons" ON public.lessons
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_lessons()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_lessons();

-- Recreate lesson_materials table to ensure foreign key consistency
DROP TABLE IF EXISTS public.lesson_materials CASCADE;

CREATE TABLE public.lesson_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('podcast', 'video', 'text', 'quiz', 'pdf', 'image', 'audio')),
  url TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for lesson_materials
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lesson_materials
DROP POLICY IF EXISTS "Anyone can view lesson materials" ON public.lesson_materials;
CREATE POLICY "Anyone can view lesson materials" ON public.lesson_materials
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage lesson materials" ON public.lesson_materials;
CREATE POLICY "Authenticated users can manage lesson materials" ON public.lesson_materials
    FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for lesson_materials
CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_id ON public.lesson_materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_type ON public.lesson_materials(type);