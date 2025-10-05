-- Migration: Add review_html column to courses table
-- This will store the generated review HTML from the 4-step course creation wizard

-- Add the review_html column to store the generated review content
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS review_html TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN courses.review_html IS 'Generated HTML review content from the course creation wizard showing course summary, lessons, and materials';

-- Create an index for potential searches on review content
CREATE INDEX IF NOT EXISTS idx_courses_review_html ON courses USING gin(to_tsvector('english', review_html)) WHERE review_html IS NOT NULL;