-- Wishlist persistence for courses

CREATE TABLE IF NOT EXISTS public.user_course_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_course_wishlist_user_id ON public.user_course_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_wishlist_course_id ON public.user_course_wishlist(course_id);

ALTER TABLE public.user_course_wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlist" ON public.user_course_wishlist;
CREATE POLICY "Users manage own wishlist" ON public.user_course_wishlist
USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()))
WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.user_course_wishlist IS 'User-saved wishlist of courses';

