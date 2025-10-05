-- Create CEFR assessment questions table
CREATE TABLE IF NOT EXISTS public.cefr_assessment_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'short-answer', 'essay', 'fill-in-blank', 'listening', 'speaking', 'reading', 'conversation')),
    cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    skill_type TEXT NOT NULL CHECK (skill_type IN ('reading', 'writing', 'listening', 'speaking', 'grammar', 'vocabulary')),
    question_text TEXT NOT NULL,
    instructions TEXT,
    options JSONB, -- For multiple choice options
    correct_answer TEXT, -- The correct answer or reference answer
    points INTEGER DEFAULT 1,
    media_files JSONB, -- Store image, audio, video, PDF file URLs
    assessment_criteria JSONB, -- Specific criteria for this question
    expected_response TEXT, -- For open-ended questions
    assessment_type TEXT, -- Type of assessment (e.g., 'conversation', 'written', 'listening')
    time_limit INTEGER, -- Time limit in seconds for timed assessments
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cefr_questions_type ON public.cefr_assessment_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_cefr_questions_level ON public.cefr_assessment_questions(cefr_level);
CREATE INDEX IF NOT EXISTS idx_cefr_questions_skill ON public.cefr_assessment_questions(skill_type);
CREATE INDEX IF NOT EXISTS idx_cefr_questions_active ON public.cefr_assessment_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_cefr_questions_created_at ON public.cefr_assessment_questions(created_at);

-- Enable Row Level Security
ALTER TABLE public.cefr_assessment_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for CEFR assessment questions table
CREATE POLICY "Anyone can view active CEFR questions" ON public.cefr_assessment_questions
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage CEFR questions" ON public.cefr_assessment_questions
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_cefr_questions_updated_at
    BEFORE UPDATE ON public.cefr_assessment_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample CEFR assessment questions
INSERT INTO public.cefr_assessment_questions (question_type, cefr_level, skill_type, question_text, instructions, options, correct_answer, points, difficulty_level) VALUES
-- A1 Level Questions
('multiple-choice', 'A1', 'vocabulary', 'What is the English word for "casa"?', 'Choose the correct translation.', '["House", "Car", "Tree", "Book"]'::jsonb, '0', 2, 'easy'),
('true-false', 'A1', 'grammar', 'The sentence "I am happy" is grammatically correct.', 'Determine if the sentence is correct.', null, 'true', 1, 'easy'),
('fill-in-blank', 'A1', 'grammar', 'My name _____ John.', 'Complete the sentence with the correct verb.', null, 'is', 2, 'easy'),

-- A2 Level Questions
('multiple-choice', 'A2', 'grammar', 'Which sentence uses the past tense correctly?', 'Choose the grammatically correct sentence.', '["I go to school yesterday", "I went to school yesterday", "I going to school yesterday", "I goes to school yesterday"]'::jsonb, '1', 3, 'medium'),
('short-answer', 'A2', 'writing', 'Describe your daily routine in 3-4 sentences.', 'Write about what you do every day.', null, 'Sample: I wake up at 7 AM. I have breakfast and go to work. In the evening, I watch TV and read books.', 5, 'medium'),

-- B1 Level Questions
('essay', 'B1', 'writing', 'Do you think social media has a positive or negative impact on society? Explain your opinion.', 'Write a short essay (150-200 words) expressing your viewpoint.', null, 'Students should present a clear opinion with supporting arguments and examples.', 10, 'medium'),
('multiple-choice', 'B1', 'vocabulary', 'What does "procrastinate" mean?', 'Choose the best definition.', '["To delay or postpone", "To work quickly", "To organize efficiently", "To complete early"]'::jsonb, '0', 3, 'medium'),

-- B2 Level Questions
('essay', 'B2', 'writing', 'Analyze the advantages and disadvantages of remote work. How has it changed the modern workplace?', 'Write a balanced analysis (250-300 words).', null, 'Should include multiple perspectives, clear structure, and sophisticated vocabulary.', 15, 'hard'),
('short-answer', 'B2', 'reading', 'After reading the passage, explain the author''s main argument and provide your critical assessment.', 'Demonstrate comprehension and critical thinking.', null, 'Should identify main points and provide thoughtful analysis.', 8, 'hard'),

-- C1 Level Questions
('essay', 'C1', 'writing', 'Evaluate the role of artificial intelligence in education. Consider both the opportunities and challenges it presents.', 'Write a comprehensive analysis (400-500 words).', null, 'Should demonstrate sophisticated language use, complex argumentation, and nuanced understanding.', 20, 'hard'),

-- C2 Level Questions
('essay', 'C2', 'writing', 'Critically examine the statement: "Language shapes thought, and thought shapes reality." Draw upon philosophical, linguistic, and cultural perspectives.', 'Write an advanced academic essay (500-600 words).', null, 'Should demonstrate native-like proficiency, complex reasoning, and sophisticated academic discourse.', 25, 'hard');

COMMIT;