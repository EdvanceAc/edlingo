-- Study reminders: user-configurable reminders for courses

CREATE TABLE IF NOT EXISTS public.study_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  time_utc TIME WITH TIME ZONE,
  weekday INTEGER CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_reminders_user_id ON public.study_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_study_reminders_course_id ON public.study_reminders(course_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_study_reminders()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_study_reminders_updated_at ON public.study_reminders;
CREATE TRIGGER update_study_reminders_updated_at
BEFORE UPDATE ON public.study_reminders
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_study_reminders();

-- Enable RLS and policies
ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reminders" ON public.study_reminders;
CREATE POLICY "Users manage own reminders" ON public.study_reminders
  USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.study_reminders IS 'User-configured study reminders for courses';

