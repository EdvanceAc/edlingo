-- Create missing tables for EdLingo admin dashboard
-- Execute this in Supabase Dashboard > SQL Editor

-- Create grammar_lessons table
CREATE TABLE IF NOT EXISTS public.grammar_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content JSONB,
    difficulty_level TEXT DEFAULT 'beginner',
    language TEXT DEFAULT 'English',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points INTEGER DEFAULT 0
);

-- Create user_vocabulary table
CREATE TABLE IF NOT EXISTS public.user_vocabulary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    definition TEXT,
    language TEXT DEFAULT 'English',
    proficiency_level INTEGER DEFAULT 1,
    last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    times_reviewed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.grammar_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for grammar_lessons (public read access)
DROP POLICY IF EXISTS "Anyone can view grammar lessons" ON public.grammar_lessons;
CREATE POLICY "Anyone can view grammar lessons" ON public.grammar_lessons FOR SELECT USING (true);

-- Create RLS policies for user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Create RLS policies for user_vocabulary
DROP POLICY IF EXISTS "Users can view own vocabulary" ON public.user_vocabulary;
DROP POLICY IF EXISTS "Users can insert own vocabulary" ON public.user_vocabulary;
DROP POLICY IF EXISTS "Users can update own vocabulary" ON public.user_vocabulary;
CREATE POLICY "Users can view own vocabulary" ON public.user_vocabulary FOR SELECT USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own vocabulary" ON public.user_vocabulary FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own vocabulary" ON public.user_vocabulary FOR UPDATE USING (user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Insert some sample data for testing
INSERT INTO public.grammar_lessons (title, description, content, difficulty_level) VALUES
('Present Simple Tense', 'Learn the basics of present simple tense', '{"examples": ["I eat breakfast", "She works here"]}', 'beginner'),
('Past Simple Tense', 'Understanding past simple tense', '{"examples": ["I ate breakfast", "She worked here"]}', 'beginner'),
('Future Tense', 'Learn about future tense forms', '{"examples": ["I will eat", "She will work"]}', 'intermediate')
ON CONFLICT (id) DO NOTHING;

SELECT 'Missing tables created successfully!' as result;