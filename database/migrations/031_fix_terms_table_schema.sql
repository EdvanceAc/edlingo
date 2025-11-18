-- Fix terms table schema conflict
-- This migration ensures the terms table exists with the correct structure

-- Drop the old terms JSONB column from courses if it exists
ALTER TABLE public.courses DROP COLUMN IF EXISTS terms;

-- Create the terms table with proper structure if it doesn't exist
CREATE TABLE IF NOT EXISTS public.terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL
);

-- Enable RLS on terms table
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for terms table
DROP POLICY IF EXISTS "Anyone can view terms" ON public.terms;
CREATE POLICY "Anyone can view terms" ON public.terms
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage terms" ON public.terms;
CREATE POLICY "Authenticated users can manage terms" ON public.terms
    FOR ALL USING (auth.role() = 'authenticated');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_terms_course_id ON public.terms(course_id);
CREATE INDEX IF NOT EXISTS idx_terms_order_number ON public.terms(order_number);