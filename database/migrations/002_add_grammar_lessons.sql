-- Add grammar_lessons table for admin dashboard
-- Migration to fix missing grammar_lessons table

-- Create grammar_lessons table
CREATE TABLE IF NOT EXISTS public.grammar_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL DEFAULT 'Spanish',
    level TEXT DEFAULT 'beginner',
    content JSONB, -- Store lesson content, exercises, examples
    difficulty_score INTEGER DEFAULT 1, -- 1-10 scale
    estimated_duration_minutes INTEGER DEFAULT 15,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grammar_lessons_language ON public.grammar_lessons(language);
CREATE INDEX IF NOT EXISTS idx_grammar_lessons_level ON public.grammar_lessons(level);
CREATE INDEX IF NOT EXISTS idx_grammar_lessons_created_at ON public.grammar_lessons(created_at);
CREATE INDEX IF NOT EXISTS idx_grammar_lessons_active ON public.grammar_lessons(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.grammar_lessons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for grammar_lessons
-- Anyone can view active grammar lessons
CREATE POLICY "Anyone can view active grammar lessons" ON public.grammar_lessons
    FOR SELECT USING (is_active = true);

-- Only authenticated users can manage grammar lessons (for admin functionality)
CREATE POLICY "Authenticated users can manage grammar lessons" ON public.grammar_lessons
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_grammar_lessons_updated_at
    BEFORE UPDATE ON public.grammar_lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample grammar lessons
INSERT INTO public.grammar_lessons (title, description, language, level, content, difficulty_score, estimated_duration_minutes, tags) VALUES
('Present Tense Basics', 'Learn the fundamentals of present tense in Spanish', 'Spanish', 'beginner', '{"type": "lesson", "exercises": []}', 2, 20, '{"grammar", "present-tense", "verbs"}'),
('Ser vs Estar', 'Understanding the difference between ser and estar', 'Spanish', 'beginner', '{"type": "lesson", "exercises": []}', 3, 25, '{"grammar", "verbs", "ser", "estar"}'),
('Past Tense (Pretérito)', 'Master the Spanish past tense', 'Spanish', 'intermediate', '{"type": "lesson", "exercises": []}', 5, 30, '{"grammar", "past-tense", "preterito"}'),
('Subjunctive Mood', 'Introduction to the subjunctive mood', 'Spanish', 'advanced', '{"type": "lesson", "exercises": []}', 8, 45, '{"grammar", "subjunctive", "mood"}'),
('Articles and Gender', 'Learn about definite and indefinite articles', 'Spanish', 'beginner', '{"type": "lesson", "exercises": []}', 2, 15, '{"grammar", "articles", "gender"}')
ON CONFLICT DO NOTHING;