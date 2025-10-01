-- Create course_reviews table with RLS

CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  content TEXT,
  is_approved BOOLEAN DEFAULT true,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON public.course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON public.course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON public.course_reviews(rating);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_course_reviews()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_course_reviews_updated_at ON public.course_reviews;
CREATE TRIGGER update_course_reviews_updated_at
BEFORE UPDATE ON public.course_reviews
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_course_reviews();

-- Enable RLS
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view approved reviews" ON public.course_reviews;
CREATE POLICY "Users can view approved reviews" ON public.course_reviews
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Users can view own unapproved reviews" ON public.course_reviews;
CREATE POLICY "Users can view own unapproved reviews" ON public.course_reviews
  FOR SELECT USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.course_reviews;
CREATE POLICY "Users can insert own reviews" ON public.course_reviews
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own reviews" ON public.course_reviews;
CREATE POLICY "Users can update own reviews" ON public.course_reviews
  FOR UPDATE USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.course_reviews IS 'User ratings and written reviews for courses';

