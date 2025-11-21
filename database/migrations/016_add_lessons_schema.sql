-- Add schema for terms, lessons, materials, books, and word highlights

CREATE TABLE public.terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL
);

CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  required_xp INTEGER DEFAULT 0,
  prerequisites JSONB,
  content JSONB
);

CREATE TABLE public.lesson_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('podcast', 'video', 'text', 'quiz', 'pdf')),
  url TEXT,
  content TEXT,
  metadata JSONB
);

CREATE TABLE public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.word_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  synonyms TEXT[],
  page_number INTEGER,
  position JSONB
);

-- Enable RLS
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_highlights ENABLE ROW LEVEL SECURITY;

-- TODO: Add appropriate RLS policies in a follow-up migration