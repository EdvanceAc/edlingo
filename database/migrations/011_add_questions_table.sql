-- Create questions table for assignment questions
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'short-answer', 'essay', 'fill-in-blank')),
    options JSONB, -- For multiple choice options
    correct_answer TEXT, -- The correct answer or reference answer
    points INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    explanation TEXT, -- Optional explanation for the answer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_assignment_id ON public.questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at);

-- Enable Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies for questions table
CREATE POLICY "Anyone can view questions" ON public.questions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage questions" ON public.questions
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample questions for testing
INSERT INTO public.questions (assignment_id, question_text, question_type, options, correct_answer, points, difficulty, explanation)
SELECT 
    a.id,
    'What is the Spanish word for "hello"?',
    'multiple-choice',
    '["Hola", "Adiós", "Gracias", "Por favor"]'::jsonb,
    '0',
    2,
    'easy',
    'Hola is the most common way to say hello in Spanish.'
FROM public.assignments a
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.questions (assignment_id, question_text, question_type, correct_answer, points, difficulty, explanation)
SELECT 
    a.id,
    'Spanish is spoken in more than 20 countries.',
    'true-false',
    'true',
    1,
    'easy',
    'Spanish is indeed spoken as an official language in 21 countries.'
FROM public.assignments a
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.questions (assignment_id, question_text, question_type, correct_answer, points, difficulty, explanation)
SELECT 
    a.id,
    'Complete the sentence: Me _____ Juan.',
    'fill-in-blank',
    'llamo',
    2,
    'medium',
    'The verb "llamarse" means "to be called" or "to be named". In first person singular, it becomes "me llamo".'
FROM public.assignments a
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.questions (assignment_id, question_text, question_type, correct_answer, points, difficulty)
SELECT 
    a.id,
    'Describe the difference between "ser" and "estar" in Spanish.',
    'essay',
    'Both "ser" and "estar" mean "to be" in English, but they are used in different contexts. "Ser" is used for permanent characteristics, identity, and essential qualities, while "estar" is used for temporary states, locations, and conditions.',
    5,
    'hard'
FROM public.assignments a
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;