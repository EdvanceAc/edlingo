-- Create lesson_submissions table for user answers and attachments per lesson

-- Table
CREATE TABLE IF NOT EXISTS public.lesson_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id UUID NULL REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  text_answer TEXT NULL,
  attachments JSONB NULL,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted | returned | graded
  score NUMERIC(5,2) NULL,
  feedback TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_user_id ON public.lesson_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_lesson_id ON public.lesson_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_created_at ON public.lesson_submissions(created_at);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lesson_submissions_set_timestamp ON public.lesson_submissions;
CREATE TRIGGER trg_lesson_submissions_set_timestamp
BEFORE UPDATE ON public.lesson_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

-- RLS
ALTER TABLE public.lesson_submissions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own submissions
DROP POLICY IF EXISTS "Users can view own lesson submissions" ON public.lesson_submissions;
CREATE POLICY "Users can view own lesson submissions" ON public.lesson_submissions
  FOR SELECT USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own lesson submissions" ON public.lesson_submissions;
CREATE POLICY "Users can insert own lesson submissions" ON public.lesson_submissions
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own lesson submissions" ON public.lesson_submissions;
CREATE POLICY "Users can update own lesson submissions" ON public.lesson_submissions
  FOR UPDATE USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Optional: instructors/admins can view for their courses (kept permissive; adjust as needed)
-- This assumes admin role is enforced via PostgREST/JWT or DB roles.

COMMENT ON TABLE public.lesson_submissions IS 'Stores user-submitted answers and attachments for lessons';
COMMENT ON COLUMN public.lesson_submissions.attachments IS 'Array of uploaded files metadata from Supabase Storage';


