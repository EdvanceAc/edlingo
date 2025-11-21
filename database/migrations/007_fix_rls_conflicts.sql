-- Fix RLS policy conflicts for courses and assignments
-- Remove conflicting policies that prevent INSERT operations

-- Drop conflicting instructor policies that block INSERT operations
DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "Course instructors can manage assignments" ON public.assignments;

-- Recreate instructor policies for UPDATE and DELETE only (not INSERT)
CREATE POLICY "Instructors can update their courses" ON public.courses
    FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can delete their courses" ON public.courses
    FOR DELETE USING (auth.uid() = instructor_id);

CREATE POLICY "Course instructors can update assignments" ON public.assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = assignments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Course instructors can delete assignments" ON public.assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = assignments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Ensure the admin policies for INSERT are the only INSERT policies
-- These should already exist from 006_add_admin_policies.sql but let's make sure
DROP POLICY IF EXISTS "Authenticated users can create courses" ON public.courses;
CREATE POLICY "Authenticated users can create courses" ON public.courses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create assignments" ON public.assignments;
CREATE POLICY "Authenticated users can create assignments" ON public.assignments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');