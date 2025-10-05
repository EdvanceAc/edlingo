-- Migration to add missing last_study_date column to user_progress and create notifications table

-- Add last_study_date to user_progress
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS last_study_date DATE;

-- Set default value and index
ALTER TABLE public.user_progress 
ALTER COLUMN last_study_date SET DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_user_progress_last_study_date ON public.user_progress(last_study_date);

-- Comment
COMMENT ON COLUMN public.user_progress.last_study_date IS 'Date of the user''s last study session';

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'general'
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Comment
COMMENT ON TABLE public.notifications IS 'User notifications with foreign key to user_profiles';