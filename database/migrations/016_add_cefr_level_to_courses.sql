-- Add cefr_level column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cefr_level TEXT DEFAULT 'A1';

-- Add comment to the column
COMMENT ON COLUMN courses.cefr_level IS 'CEFR level for the course (A1, A2, B1, B2, C1, C2)';

-- Update existing courses with appropriate CEFR levels based on their current level
UPDATE courses 
SET cefr_level = CASE 
    WHEN level ILIKE '%beginner%' OR level ILIKE '%a1%' THEN 'A1'
    WHEN level ILIKE '%elementary%' OR level ILIKE '%a2%' THEN 'A2'
    WHEN level ILIKE '%intermediate%' OR level ILIKE '%b1%' THEN 'B1'
    WHEN level ILIKE '%upper%' OR level ILIKE '%b2%' THEN 'B2'
    WHEN level ILIKE '%advanced%' OR level ILIKE '%c1%' THEN 'C1'
    WHEN level ILIKE '%proficiency%' OR level ILIKE '%c2%' THEN 'C2'
    ELSE 'A1'
END
WHERE cefr_level IS NULL OR cefr_level = 'A1';