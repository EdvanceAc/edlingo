-- Add Content Delivery & Progression System
-- Migration to implement sequential content unlocking and progression tracking

-- Create content modules table for structured learning paths
CREATE TABLE IF NOT EXISTS public.content_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL,
    cefr_level TEXT NOT NULL, -- A1, A2, B1, B2, C1, C2
    module_type TEXT NOT NULL, -- 'lesson', 'assignment', 'test', 'conversation'
    order_index INTEGER NOT NULL, -- Sequential order within level
    prerequisites UUID[], -- Array of module IDs that must be completed first
    min_score_required DECIMAL(5,2) DEFAULT 70.0, -- Minimum score to pass
    min_conversation_turns INTEGER DEFAULT 0, -- For conversation modules
    estimated_duration_minutes INTEGER DEFAULT 15,
    content JSONB, -- Module content and exercises
    readability_score DECIMAL(5,2), -- Composite Grade Level from readability analysis
    difficulty_score INTEGER DEFAULT 1, -- 1-10 scale
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user module progress table
CREATE TABLE IF NOT EXISTS public.user_module_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.content_modules(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'locked', -- 'locked', 'available', 'in_progress', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    best_score DECIMAL(5,2),
    last_score DECIMAL(5,2),
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    time_spent_minutes INTEGER DEFAULT 0,
    conversation_turns_completed INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- Create learning paths table for structured progression
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL,
    target_cefr_level TEXT NOT NULL,
    starting_cefr_level TEXT NOT NULL,
    module_sequence UUID[], -- Ordered array of module IDs
    estimated_total_hours INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user learning path enrollments
CREATE TABLE IF NOT EXISTS public.user_learning_paths (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    current_module_index INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, learning_path_id)
);

-- Create progression rules table for flexible unlocking logic
CREATE TABLE IF NOT EXISTS public.progression_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'prerequisite', 'score_threshold', 'conversation_requirement', 'time_gate'
    target_module_id UUID REFERENCES public.content_modules(id) ON DELETE CASCADE,
    rule_config JSONB NOT NULL, -- Flexible rule configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create text simplification cache for different proficiency levels
CREATE TABLE IF NOT EXISTS public.text_simplifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_text_hash TEXT NOT NULL, -- Hash of original text for caching
    original_text TEXT NOT NULL,
    target_cefr_level TEXT NOT NULL,
    simplified_text TEXT NOT NULL,
    readability_score DECIMAL(5,2),
    simplification_method TEXT DEFAULT 'ai', -- 'ai', 'manual', 'rule_based'
    quality_score DECIMAL(5,2), -- Quality assessment of simplification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(original_text_hash, target_cefr_level)
);

-- Create conversation engagement tracking
CREATE TABLE IF NOT EXISTS public.conversation_engagement (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.content_modules(id),
    total_turns INTEGER DEFAULT 0,
    user_turns INTEGER DEFAULT 0,
    ai_turns INTEGER DEFAULT 0,
    avg_response_time_seconds DECIMAL(8,2),
    engagement_score DECIMAL(5,2), -- 0-100 based on participation quality
    topics_covered TEXT[],
    language_used TEXT NOT NULL,
    session_quality TEXT DEFAULT 'good', -- 'poor', 'fair', 'good', 'excellent'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_modules_language_level ON public.content_modules(language, cefr_level);
CREATE INDEX IF NOT EXISTS idx_content_modules_order ON public.content_modules(order_index);
CREATE INDEX IF NOT EXISTS idx_content_modules_type ON public.content_modules(module_type);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_id ON public.user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_status ON public.user_module_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_module_id ON public.user_module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_language ON public.learning_paths(language);
CREATE INDEX IF NOT EXISTS idx_user_learning_paths_user_id ON public.user_learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_progression_rules_target_module ON public.progression_rules(target_module_id);
CREATE INDEX IF NOT EXISTS idx_text_simplifications_hash_level ON public.text_simplifications(original_text_hash, target_cefr_level);
CREATE INDEX IF NOT EXISTS idx_conversation_engagement_user_id ON public.conversation_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_engagement_session_id ON public.conversation_engagement(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.content_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_simplifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_engagement ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Content modules policies (public read for active modules)
DROP POLICY IF EXISTS "Anyone can view active content modules" ON public.content_modules;
CREATE POLICY "Anyone can view active content modules" ON public.content_modules
    FOR SELECT USING (is_active = true);

-- User module progress policies
DROP POLICY IF EXISTS "Users can view own module progress" ON public.user_module_progress;
CREATE POLICY "Users can view own module progress" ON public.user_module_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own module progress" ON public.user_module_progress;
CREATE POLICY "Users can manage own module progress" ON public.user_module_progress
    FOR ALL USING (auth.uid() = user_id);

-- Learning paths policies (public read for active paths)
DROP POLICY IF EXISTS "Anyone can view active learning paths" ON public.learning_paths;
CREATE POLICY "Anyone can view active learning paths" ON public.learning_paths
    FOR SELECT USING (is_active = true);

-- User learning paths policies
DROP POLICY IF EXISTS "Users can view own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can view own learning paths" ON public.user_learning_paths
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own learning paths" ON public.user_learning_paths;
CREATE POLICY "Users can manage own learning paths" ON public.user_learning_paths
    FOR ALL USING (auth.uid() = user_id);

-- Progression rules policies (public read)
DROP POLICY IF EXISTS "Anyone can view active progression rules" ON public.progression_rules;
CREATE POLICY "Anyone can view active progression rules" ON public.progression_rules
    FOR SELECT USING (is_active = true);

-- Text simplifications policies (public read)
DROP POLICY IF EXISTS "Anyone can view text simplifications" ON public.text_simplifications;
CREATE POLICY "Anyone can view text simplifications" ON public.text_simplifications
    FOR SELECT USING (true);

-- Conversation engagement policies
DROP POLICY IF EXISTS "Users can view own conversation engagement" ON public.conversation_engagement;
CREATE POLICY "Users can view own conversation engagement" ON public.conversation_engagement
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own conversation engagement" ON public.conversation_engagement;
CREATE POLICY "Users can manage own conversation engagement" ON public.conversation_engagement
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample content modules for Spanish learning
INSERT INTO public.content_modules (title, description, language, cefr_level, module_type, order_index, prerequisites, min_score_required, content, readability_score, difficulty_score) VALUES
-- A1 Level Modules
('Basic Greetings', 'Learn essential Spanish greetings and introductions', 'Spanish', 'A1', 'lesson', 1, '{}', 70.0, '{"type": "lesson", "exercises": [], "audio_enabled": true}', 5.2, 1),
('Numbers 1-20', 'Master basic numbers in Spanish', 'Spanish', 'A1', 'lesson', 2, '{}', 70.0, '{"type": "lesson", "exercises": [], "audio_enabled": true}', 4.8, 1),
('Greetings Test', 'Assessment of basic greetings knowledge', 'Spanish', 'A1', 'test', 3, '{}', 80.0, '{"type": "test", "questions": 10}', 5.0, 2),
('First Conversation', 'Practice basic introductions with AI', 'Spanish', 'A1', 'conversation', 4, '{}', 70.0, '{"type": "conversation", "scenario": "meeting_someone_new"}', 5.5, 2),

-- A2 Level Modules
('Present Tense Verbs', 'Learn regular present tense conjugations', 'Spanish', 'A2', 'lesson', 5, '{}', 75.0, '{"type": "lesson", "exercises": [], "audio_enabled": true}', 6.8, 3),
('Family and Relationships', 'Vocabulary for describing family', 'Spanish', 'A2', 'lesson', 6, '{}', 75.0, '{"type": "lesson", "exercises": [], "audio_enabled": true}', 6.5, 3),
('Present Tense Assignment', 'Practice conjugating present tense verbs', 'Spanish', 'A2', 'assignment', 7, '{}', 80.0, '{"type": "assignment", "exercises": 15}', 7.0, 4),

-- B1 Level Modules
('Past Tense (Pretérito)', 'Master the Spanish past tense', 'Spanish', 'B1', 'lesson', 8, '{}', 75.0, '{"type": "lesson", "exercises": [], "audio_enabled": true}', 8.2, 5),
('Travel Conversation', 'Practice travel-related conversations', 'Spanish', 'B1', 'conversation', 9, '{}', 75.0, '{"type": "conversation", "scenario": "travel_planning"}', 8.5, 5)
ON CONFLICT DO NOTHING;

-- Insert sample learning path
INSERT INTO public.learning_paths (name, description, language, target_cefr_level, starting_cefr_level, module_sequence, estimated_total_hours) VALUES
('Spanish Beginner to Intermediate', 'Complete learning path from A1 to B1 level', 'Spanish', 'B1', 'A1', 
 ARRAY(
   SELECT id::text FROM public.content_modules 
   WHERE language = 'Spanish' AND cefr_level IN ('A1', 'A2', 'B1') 
   ORDER BY order_index
 )::UUID[], 40)
ON CONFLICT DO NOTHING;

-- Insert sample progression rules
INSERT INTO public.progression_rules (rule_name, rule_type, target_module_id, rule_config) VALUES
('Conversation Turn Requirement', 'conversation_requirement', 
 (SELECT id FROM public.content_modules WHERE title = 'First Conversation' LIMIT 1),
 '{"min_turns": 10, "min_engagement_score": 60}'),
('Score Threshold for Tests', 'score_threshold',
 (SELECT id FROM public.content_modules WHERE title = 'Greetings Test' LIMIT 1),
 '{"min_score": 80, "max_attempts": 3}'),
('Time Gate for Advanced Content', 'time_gate',
 (SELECT id FROM public.content_modules WHERE title = 'Past Tense (Pretérito)' LIMIT 1),
 '{"min_days_since_enrollment": 7, "min_total_study_hours": 5}')
ON CONFLICT DO NOTHING;