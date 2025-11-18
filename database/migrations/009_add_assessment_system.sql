-- Add assessment system tables for AI-driven language proficiency evaluation
-- Migration to support initial language proficiency assessment

-- Create assessment sessions table
CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL, -- 'initial', 'periodic', 'placement'
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    target_language TEXT NOT NULL,
    total_duration_minutes INTEGER,
    overall_score DECIMAL(5,2), -- 0-100 scale
    cefr_level TEXT, -- A1, A2, B1, B2, C1, C2
    ielts_equivalent DECIMAL(3,1), -- 0.0-9.0 scale
    proficiency_breakdown JSONB, -- Detailed scores by skill area
    ai_analysis JSONB, -- AI-generated analysis and recommendations
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessment tasks table
CREATE TABLE IF NOT EXISTS public.assessment_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL, -- 'conversation', 'writing', 'grammar', 'vocabulary', 'pronunciation'
    task_order INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    expected_duration_minutes INTEGER,
    max_score INTEGER DEFAULT 100,
    user_response TEXT,
    audio_response_url TEXT, -- For pronunciation/conversation tasks
    score DECIMAL(5,2),
    ai_feedback JSONB, -- Detailed AI analysis
    skill_scores JSONB, -- Breakdown by specific skills
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessment criteria table
CREATE TABLE IF NOT EXISTS public.assessment_criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_area TEXT NOT NULL, -- 'grammar', 'vocabulary', 'fluency', 'pronunciation', 'comprehension'
    cefr_level TEXT NOT NULL,
    criteria_description TEXT NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0, -- Weighting for overall score calculation
    scoring_rubric JSONB, -- Detailed scoring guidelines
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user proficiency profiles table
CREATE TABLE IF NOT EXISTS public.user_proficiency_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    current_cefr_level TEXT NOT NULL,
    ielts_equivalent DECIMAL(3,1),
    overall_score DECIMAL(5,2),
    grammar_score DECIMAL(5,2),
    vocabulary_score DECIMAL(5,2),
    fluency_score DECIMAL(5,2),
    pronunciation_score DECIMAL(5,2),
    comprehension_score DECIMAL(5,2),
    strengths TEXT[],
    weaknesses TEXT[],
    recommended_level TEXT, -- Suggested learning level
    learning_path JSONB, -- Personalized learning recommendations
    last_assessment_id UUID REFERENCES public.assessment_sessions(id),
    assessment_date TIMESTAMP WITH TIME ZONE,
    next_assessment_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, language)
);

-- Insert default assessment criteria for CEFR levels
INSERT INTO public.assessment_criteria (skill_area, cefr_level, criteria_description, weight, scoring_rubric) VALUES
-- Grammar criteria
('grammar', 'A1', 'Basic sentence structures, present tense, simple questions', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('grammar', 'A2', 'Past and future tenses, comparatives, modal verbs', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('grammar', 'B1', 'Complex sentences, conditionals, passive voice', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('grammar', 'B2', 'Advanced tenses, subjunctive, complex conditionals', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('grammar', 'C1', 'Sophisticated structures, nuanced expressions', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('grammar', 'C2', 'Native-like accuracy, complex literary structures', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),

-- Vocabulary criteria
('vocabulary', 'A1', '500-1000 basic words, everyday topics', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('vocabulary', 'A2', '1000-2000 words, familiar situations', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('vocabulary', 'B1', '2000-3000 words, abstract concepts', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('vocabulary', 'B2', '3000-5000 words, specialized topics', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('vocabulary', 'C1', '5000-8000 words, nuanced meanings', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('vocabulary', 'C2', '8000+ words, idiomatic expressions', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),

-- Fluency criteria
('fluency', 'A1', 'Slow, frequent pauses, simple phrases', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('fluency', 'A2', 'Some hesitation, basic connected speech', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('fluency', 'B1', 'Generally fluent, occasional hesitation', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('fluency', 'B2', 'Smooth delivery, natural pace', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('fluency', 'C1', 'Effortless expression, varied pace', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}'),
('fluency', 'C2', 'Native-like fluency and spontaneity', 1.0, '{"excellent": 90, "good": 70, "fair": 50, "poor": 30}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON public.assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status ON public.assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_assessment_tasks_session_id ON public.assessment_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_tasks_type ON public.assessment_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_assessment_criteria_skill_level ON public.assessment_criteria(skill_area, cefr_level);
CREATE INDEX IF NOT EXISTS idx_user_proficiency_user_lang ON public.user_proficiency_profiles(user_id, language);

-- Enable Row Level Security (RLS)
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_proficiency_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Assessment sessions policies
DROP POLICY IF EXISTS "Users can view own assessment sessions" ON public.assessment_sessions;
CREATE POLICY "Users can view own assessment sessions" ON public.assessment_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own assessment sessions" ON public.assessment_sessions;
CREATE POLICY "Users can manage own assessment sessions" ON public.assessment_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Assessment tasks policies
DROP POLICY IF EXISTS "Users can view own assessment tasks" ON public.assessment_tasks;
CREATE POLICY "Users can view own assessment tasks" ON public.assessment_tasks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.assessment_sessions 
        WHERE id = assessment_tasks.session_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can manage own assessment tasks" ON public.assessment_tasks;
CREATE POLICY "Users can manage own assessment tasks" ON public.assessment_tasks
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.assessment_sessions 
        WHERE id = assessment_tasks.session_id AND user_id = auth.uid()
    ));

-- Assessment criteria policies (public read)
DROP POLICY IF EXISTS "Anyone can view assessment criteria" ON public.assessment_criteria;
CREATE POLICY "Anyone can view assessment criteria" ON public.assessment_criteria
    FOR SELECT USING (true);

-- User proficiency profiles policies
DROP POLICY IF EXISTS "Users can view own proficiency profile" ON public.user_proficiency_profiles;
CREATE POLICY "Users can view own proficiency profile" ON public.user_proficiency_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own proficiency profile" ON public.user_proficiency_profiles;
CREATE POLICY "Users can manage own proficiency profile" ON public.user_proficiency_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Update user_profiles table to include assessment status
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_assessment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS placement_level TEXT;

-- Create function to update user profile after assessment completion
CREATE OR REPLACE FUNCTION update_user_profile_after_assessment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user profile when assessment is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.user_profiles 
        SET 
            assessment_completed = true,
            initial_assessment_date = NEW.completed_at,
            placement_level = NEW.cefr_level,
            learning_level = LOWER(NEW.cefr_level),
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Also update or create proficiency profile
        INSERT INTO public.user_proficiency_profiles (
            user_id, language, current_cefr_level, ielts_equivalent, 
            overall_score, last_assessment_id, assessment_date
        ) VALUES (
            NEW.user_id, NEW.target_language, NEW.cefr_level, 
            NEW.ielts_equivalent, NEW.overall_score, NEW.id, NEW.completed_at
        )
        ON CONFLICT (user_id, language) 
        DO UPDATE SET
            current_cefr_level = NEW.cefr_level,
            ielts_equivalent = NEW.ielts_equivalent,
            overall_score = NEW.overall_score,
            last_assessment_id = NEW.id,
            assessment_date = NEW.completed_at,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assessment completion
DROP TRIGGER IF EXISTS trigger_update_profile_after_assessment ON public.assessment_sessions;
CREATE TRIGGER trigger_update_profile_after_assessment
    AFTER UPDATE ON public.assessment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_after_assessment();