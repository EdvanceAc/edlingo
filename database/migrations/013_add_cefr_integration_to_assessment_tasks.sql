-- Add CEFR integration columns to assessment_tasks table
-- This migration adds support for linking assessment tasks to CEFR questions

ALTER TABLE public.assessment_tasks 
ADD COLUMN IF NOT EXISTS cefr_question_id UUID REFERENCES public.cefr_assessment_questions(id),
ADD COLUMN IF NOT EXISTS cefr_level TEXT,
ADD COLUMN IF NOT EXISTS skill_type TEXT,
ADD COLUMN IF NOT EXISTS question_data JSONB,
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_tasks_cefr_question_id ON public.assessment_tasks(cefr_question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_tasks_cefr_level ON public.assessment_tasks(cefr_level);
CREATE INDEX IF NOT EXISTS idx_assessment_tasks_skill_type ON public.assessment_tasks(skill_type);
CREATE INDEX IF NOT EXISTS idx_assessment_tasks_is_correct ON public.assessment_tasks(is_correct);

-- Add comments to document the new columns
COMMENT ON COLUMN public.assessment_tasks.cefr_question_id IS 'Reference to the CEFR question used for this task';
COMMENT ON COLUMN public.assessment_tasks.cefr_level IS 'CEFR level of the question (A1, A2, B1, B2, C1, C2)';
COMMENT ON COLUMN public.assessment_tasks.skill_type IS 'Type of skill being assessed (grammar, vocabulary, reading, writing, speaking, listening)';
COMMENT ON COLUMN public.assessment_tasks.question_data IS 'JSON data containing question details (question_text, instructions, options, correct_answer, etc.)';
COMMENT ON COLUMN public.assessment_tasks.is_correct IS 'Whether the user answer was correct (for auto-gradable questions like multiple-choice)';

-- Update the task_type column to support new question types
ALTER TABLE public.assessment_tasks 
DROP CONSTRAINT IF EXISTS assessment_tasks_task_type_check;

ALTER TABLE public.assessment_tasks 
ADD CONSTRAINT assessment_tasks_task_type_check 
CHECK (task_type IN (
    'conversation', 'writing', 'grammar', 'vocabulary', 'pronunciation',
    'multiple-choice', 'true-false', 'short-answer', 'essay', 'fill-in-blank',
    'listening', 'speaking', 'reading', 'general'
));

-- Add constraint for CEFR level values
ALTER TABLE public.assessment_tasks 
ADD CONSTRAINT assessment_tasks_cefr_level_check 
CHECK (cefr_level IS NULL OR cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

-- Add constraint for skill type values
ALTER TABLE public.assessment_tasks 
ADD CONSTRAINT assessment_tasks_skill_type_check 
CHECK (skill_type IS NULL OR skill_type IN (
    'grammar', 'vocabulary', 'reading', 'writing', 'speaking', 'listening'
));