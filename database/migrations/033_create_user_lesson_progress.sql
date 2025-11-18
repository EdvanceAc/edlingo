-- Create user_lesson_progress table to track individual lesson completions
-- This table will store which lessons each user has completed

CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    xp_earned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    score DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user per lesson
    UNIQUE(user_id, lesson_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON public.user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON public.user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_completed_at ON public.user_lesson_progress(completed_at);

-- Enable RLS
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own lesson progress" ON public.user_lesson_progress
    FOR SELECT USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own lesson progress" ON public.user_lesson_progress
    FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own lesson progress" ON public.user_lesson_progress
    FOR UPDATE USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Add comments
COMMENT ON TABLE public.user_lesson_progress IS 'Tracks individual lesson completion progress for each user';
COMMENT ON COLUMN public.user_lesson_progress.user_id IS 'Reference to the user who completed the lesson';
COMMENT ON COLUMN public.user_lesson_progress.lesson_id IS 'Reference to the completed lesson';
COMMENT ON COLUMN public.user_lesson_progress.completed_at IS 'When the lesson was completed';
COMMENT ON COLUMN public.user_lesson_progress.xp_earned IS 'XP points earned for completing this lesson';
COMMENT ON COLUMN public.user_lesson_progress.time_spent_minutes IS 'Time spent on this lesson in minutes';
COMMENT ON COLUMN public.user_lesson_progress.score IS 'Score achieved in this lesson (0-100)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_lesson_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_lesson_progress_updated_at
    BEFORE UPDATE ON public.user_lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_user_lesson_progress_updated_at();