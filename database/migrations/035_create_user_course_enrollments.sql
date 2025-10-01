-- Create user_course_enrollments table with RLS

CREATE TABLE IF NOT EXISTS public.user_course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','in_progress','completed','withdrawn')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_user_id ON public.user_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_course_id ON public.user_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_status ON public.user_course_enrollments(status);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at_user_course_enrollments()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_course_enrollments_updated_at ON public.user_course_enrollments;
CREATE TRIGGER update_user_course_enrollments_updated_at
BEFORE UPDATE ON public.user_course_enrollments
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_user_course_enrollments();

-- Enable RLS
ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies: users access only their own enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.user_course_enrollments;
CREATE POLICY "Users can view own enrollments" ON public.user_course_enrollments
    FOR SELECT USING (
        user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can upsert own enrollments" ON public.user_course_enrollments;
CREATE POLICY "Users can upsert own enrollments" ON public.user_course_enrollments
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own enrollments" ON public.user_course_enrollments;
CREATE POLICY "Users can update own enrollments" ON public.user_course_enrollments
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    );

COMMENT ON TABLE public.user_course_enrollments IS 'Tracks user enrollment and course-level progress';
COMMENT ON COLUMN public.user_course_enrollments.status IS 'enrolled|in_progress|completed|withdrawn';


