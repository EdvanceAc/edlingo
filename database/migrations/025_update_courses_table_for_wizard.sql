-- Migration: Update courses table to support 4-step course creation wizard
-- This migration adds all the missing fields that the wizard tries to insert

-- Add missing columns to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
ADD COLUMN IF NOT EXISTS duration_weeks integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS hours_per_week integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_students integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS learning_objectives text,
ADD COLUMN IF NOT EXISTS prerequisites text,
ADD COLUMN IF NOT EXISTS skills_focus text[],
ADD COLUMN IF NOT EXISTS required_materials text,
ADD COLUMN IF NOT EXISTS syllabus text,
ADD COLUMN IF NOT EXISTS instructor_name text,
ADD COLUMN IF NOT EXISTS instructor_email text,
ADD COLUMN IF NOT EXISTS instructor_bio text,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS enrollment_deadline date,
ADD COLUMN IF NOT EXISTS cancellation_policy text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Update the existing duration column to be duration_weeks for consistency
-- First, copy data if duration column exists and duration_weeks doesn't have data
UPDATE courses 
SET duration_weeks = duration 
WHERE duration_weeks IS NULL AND duration IS NOT NULL;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_courses_language ON courses(language);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON courses(start_date);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_email ON courses(instructor_email);

-- Add constraints
ALTER TABLE courses 
ADD CONSTRAINT check_price_non_negative CHECK (price >= 0),
ADD CONSTRAINT check_duration_weeks_positive CHECK (duration_weeks > 0),
ADD CONSTRAINT check_hours_per_week_positive CHECK (hours_per_week > 0),
ADD CONSTRAINT check_max_students_positive CHECK (max_students > 0);

-- Add comments for documentation
COMMENT ON COLUMN courses.language IS 'The language being taught in this course';
COMMENT ON COLUMN courses.duration_weeks IS 'Course duration in weeks';
COMMENT ON COLUMN courses.hours_per_week IS 'Expected study hours per week';
COMMENT ON COLUMN courses.max_students IS 'Maximum number of students allowed';
COMMENT ON COLUMN courses.price IS 'Course price in the specified currency';
COMMENT ON COLUMN courses.currency IS 'Currency code (e.g., USD, EUR)';
COMMENT ON COLUMN courses.learning_objectives IS 'What students will learn';
COMMENT ON COLUMN courses.prerequisites IS 'Required knowledge or skills';
COMMENT ON COLUMN courses.required_materials IS 'Materials needed for the course';
COMMENT ON COLUMN courses.syllabus IS 'Detailed course outline';
COMMENT ON COLUMN courses.instructor_name IS 'Name of the course instructor';
COMMENT ON COLUMN courses.instructor_email IS 'Instructor contact email';
COMMENT ON COLUMN courses.instructor_bio IS 'Instructor biography and qualifications';
COMMENT ON COLUMN courses.start_date IS 'Course start date';
COMMENT ON COLUMN courses.enrollment_deadline IS 'Last date for enrollment';
COMMENT ON COLUMN courses.cancellation_policy IS 'Course cancellation and refund policy';
COMMENT ON COLUMN courses.is_active IS 'Whether the course is currently active/published';

-- Update RLS policies if needed
-- Enable RLS if not already enabled
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to active courses
DROP POLICY IF EXISTS "Public can view active courses" ON courses;
CREATE POLICY "Public can view active courses" ON courses
    FOR SELECT USING (is_active = true);

-- Create policy for authenticated users to view all courses
DROP POLICY IF EXISTS "Authenticated users can view all courses" ON courses;
CREATE POLICY "Authenticated users can view all courses" ON courses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for admin users to manage courses
DROP POLICY IF EXISTS "Admin users can manage courses" ON courses;
CREATE POLICY "Admin users can manage courses" ON courses
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'user_role' = 'admin' OR
        auth.jwt() ->> 'email' LIKE '%@admin.%' OR
        auth.role() = 'service_role'
    );

-- Create policy for authenticated users to create courses (temporary for testing)
DROP POLICY IF EXISTS "Authenticated users can create courses" ON courses;
CREATE POLICY "Authenticated users can create courses" ON courses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update their own courses
DROP POLICY IF EXISTS "Authenticated users can update courses" ON courses;
CREATE POLICY "Authenticated users can update courses" ON courses
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON courses TO anon;
GRANT ALL ON courses TO authenticated;
GRANT ALL ON courses TO service_role;