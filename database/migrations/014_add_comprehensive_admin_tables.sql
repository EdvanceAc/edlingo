-- Comprehensive Admin Dashboard Tables
-- Migration to add all missing tables for the comprehensive admin dashboard features

-- 1. GAMIFICATION SYSTEM TABLES

-- Badges and achievements system
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    criteria JSONB, -- Conditions to earn the badge
    points_value INTEGER DEFAULT 0,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress JSONB, -- Progress towards earning the badge
    UNIQUE(user_id, badge_id)
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS public.leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    leaderboard_type TEXT DEFAULT 'xp' CHECK (leaderboard_type IN ('xp', 'streak', 'lessons', 'words', 'custom')),
    time_period TEXT DEFAULT 'all_time' CHECK (time_period IN ('daily', 'weekly', 'monthly', 'all_time')),
    language TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard entries
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    leaderboard_id UUID REFERENCES public.leaderboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    rank INTEGER,
    period_start DATE,
    period_end DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leaderboard_id, user_id, period_start)
);

-- 2. CONTENT MANAGEMENT SYSTEM TABLES

-- Course templates
CREATE TABLE IF NOT EXISTS public.course_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL,
    cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    template_data JSONB, -- Course structure and content
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons (detailed lesson content)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lesson_type TEXT DEFAULT 'vocabulary' CHECK (lesson_type IN ('vocabulary', 'grammar', 'conversation', 'listening', 'reading', 'writing', 'speaking')),
    content JSONB, -- Lesson content, exercises, media
    order_index INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 15,
    difficulty_level TEXT DEFAULT 'beginner',
    prerequisites TEXT[], -- Array of lesson IDs
    learning_objectives TEXT[],
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multimedia content
CREATE TABLE IF NOT EXISTS public.media_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'document')),
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    duration_seconds INTEGER, -- For audio/video
    alt_text TEXT, -- For images
    transcript TEXT, -- For audio/video
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ADVANCED ANALYTICS TABLES

-- Learning analytics events
CREATE TABLE IF NOT EXISTS public.learning_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'lesson_start', 'lesson_complete', 'exercise_attempt', 'mistake', etc.
    event_data JSONB, -- Detailed event information
    lesson_id UUID REFERENCES public.lessons(id),
    course_id UUID REFERENCES public.courses(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User behavior analytics
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    total_time_minutes INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    exercises_attempted INTEGER DEFAULT 0,
    exercises_correct INTEGER DEFAULT 0,
    words_learned INTEGER DEFAULT 0,
    mistakes_made INTEGER DEFAULT 0,
    peak_activity_hour INTEGER, -- 0-23
    device_type TEXT,
    engagement_score DECIMAL(5,2), -- 0-100
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Course analytics
CREATE TABLE IF NOT EXISTS public.course_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    enrollments INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    dropouts INTEGER DEFAULT 0,
    avg_completion_time_hours DECIMAL(8,2),
    avg_satisfaction_score DECIMAL(3,2), -- 1-5
    total_time_spent_hours DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, date)
);

-- 4. AI INTEGRATION TABLES

-- AI content generation history
CREATE TABLE IF NOT EXISTS public.ai_content_generation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    content_type TEXT NOT NULL, -- 'lesson', 'exercise', 'question', 'feedback'
    prompt TEXT NOT NULL,
    generated_content JSONB,
    model_used TEXT,
    generation_time_ms INTEGER,
    quality_score DECIMAL(3,2), -- 1-5
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL, -- 'next_lesson', 'review_content', 'difficulty_adjustment'
    content_id UUID, -- Could reference lessons, courses, etc.
    recommendation_data JSONB,
    confidence_score DECIMAL(3,2), -- 0-1
    is_accepted BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. USER MANAGEMENT TABLES

-- User roles and permissions
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'admin', 'super_admin')),
    permissions JSONB, -- Specific permissions for the role
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role)
);

-- Course enrollments
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, course_id)
);

-- Instructor assignments
CREATE TABLE IF NOT EXISTS public.instructor_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(instructor_id, course_id)
);

-- 6. SYSTEM CONFIGURATION TABLES

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT false, -- Whether setting is visible to non-admins
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    template_type TEXT NOT NULL, -- 'email', 'push', 'in_app'
    subject TEXT,
    content TEXT NOT NULL,
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.notification_templates(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info' CHECK (notification_type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard_id ON public.leaderboard_entries(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON public.leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score ON public.leaderboard_entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON public.lessons(order_index);
CREATE INDEX IF NOT EXISTS idx_media_content_lesson_id ON public.media_content(lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_id ON public.learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_timestamp ON public.learning_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON public.user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_course_analytics_course_id ON public.course_analytics(course_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_date ON public.course_analytics(date);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_generation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES

-- Badges policies (public read, admin write)
CREATE POLICY "Anyone can view active badges" ON public.badges
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage badges" ON public.badges
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
    ));

-- User badges policies
CREATE POLICY "Users can view own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user badges" ON public.user_badges
    FOR INSERT WITH CHECK (true); -- Allow system to award badges

-- Leaderboards policies
CREATE POLICY "Anyone can view active leaderboards" ON public.leaderboards
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view leaderboard entries" ON public.leaderboard_entries
    FOR SELECT USING (true);

-- Course templates policies
CREATE POLICY "Instructors can view course templates" ON public.course_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage course templates" ON public.course_templates
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor') AND is_active = true
    ));

-- Lessons policies
CREATE POLICY "Users can view published lessons" ON public.lessons
    FOR SELECT USING (is_published = true OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor') AND is_active = true
    ));

CREATE POLICY "Instructors can manage lessons" ON public.lessons
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor') AND is_active = true
    ));

-- User analytics policies
CREATE POLICY "Users can view own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON public.user_analytics
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
    ));

-- Course enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" ON public.course_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment progress" ON public.course_enrollments
    FOR UPDATE USING (auth.uid() = user_id);

-- User notifications policies
CREATE POLICY "Users can view own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System settings policies (admin only)
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
    ));

CREATE POLICY "Users can view public settings" ON public.system_settings
    FOR SELECT USING (is_public = true);

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category, is_public) VALUES
('app_name', '"EdLingo"', 'Application name', 'general', true),
('default_language', '"en"', 'Default application language', 'general', true),
('max_daily_xp', '1000', 'Maximum XP points per day', 'gamification', false),
('streak_freeze_cost', '10', 'Cost in gems to freeze streak', 'gamification', true),
('ai_content_generation_enabled', 'true', 'Enable AI content generation', 'ai', false),
('analytics_retention_days', '365', 'Days to retain analytics data', 'analytics', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default badges
INSERT INTO public.badges (name, description, criteria, points_value, rarity) VALUES
('First Lesson', 'Complete your first lesson', '{"type": "lesson_completion", "count": 1}', 10, 'common'),
('Week Warrior', 'Maintain a 7-day streak', '{"type": "streak", "days": 7}', 50, 'rare'),
('Grammar Master', 'Complete 10 grammar lessons', '{"type": "lesson_type_completion", "lesson_type": "grammar", "count": 10}', 100, 'epic'),
('Vocabulary Virtuoso', 'Learn 100 new words', '{"type": "words_learned", "count": 100}', 150, 'epic'),
('Perfect Score', 'Get 100% on any assessment', '{"type": "perfect_assessment", "count": 1}', 25, 'rare'),
('Early Bird', 'Complete lessons before 9 AM for 5 days', '{"type": "early_completion", "days": 5}', 75, 'rare')
ON CONFLICT (name) DO NOTHING;

-- Insert default leaderboards
INSERT INTO public.leaderboards (name, description, leaderboard_type, time_period) VALUES
('Weekly XP Champions', 'Top XP earners this week', 'xp', 'weekly'),
('Monthly Streak Masters', 'Longest streaks this month', 'streak', 'monthly'),
('All-Time Legends', 'Highest XP earners of all time', 'xp', 'all_time'),
('Daily Achievers', 'Most lessons completed today', 'lessons', 'daily')
ON CONFLICT (name) DO NOTHING;

-- Insert default notification templates
INSERT INTO public.notification_templates (name, template_type, subject, content, variables) VALUES
('welcome_message', 'in_app', 'Welcome to EdLingo!', 'Welcome {{user_name}}! Start your language learning journey today.', '{"user_name": "string"}'),
('streak_reminder', 'push', 'Don\'t break your streak!', 'You have a {{streak_days}}-day streak. Complete a lesson to keep it going!', '{"streak_days": "number"}'),
('badge_earned', 'in_app', 'Badge Earned!', 'Congratulations! You\'ve earned the "{{badge_name}}" badge!', '{"badge_name": "string"}'),
('course_completion', 'email', 'Course Completed!', 'Congratulations {{user_name}}! You\'ve completed the "{{course_name}}" course.', '{"user_name": "string", "course_name": "string"}')
ON CONFLICT (name) DO NOTHING;