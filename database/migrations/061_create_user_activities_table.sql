-- Create user_activities table to track all user actions for progress system

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}'::jsonb,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON public.user_activities(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activities" ON public.user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT ON public.user_activities TO authenticated;

-- Add comments
COMMENT ON TABLE public.user_activities IS 'Tracks all user activities for progress and analytics';
COMMENT ON COLUMN public.user_activities.activity_type IS 'Type of activity: lesson_completed, chat_message, live_conversation_start, etc.';
COMMENT ON COLUMN public.user_activities.activity_data IS 'JSON data specific to the activity type';
COMMENT ON COLUMN public.user_activities.xp_earned IS 'XP points earned from this activity';
