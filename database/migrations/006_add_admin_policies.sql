-- Add admin policies for courses and assignments creation
-- Migration to allow authenticated users to create courses and assignments from admin dashboard

-- Add policy for authenticated users to create courses
DROP POLICY IF EXISTS "Authenticated users can create courses" ON public.courses;
CREATE POLICY "Authenticated users can create courses" ON public.courses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add policy for authenticated users to create assignments
DROP POLICY IF EXISTS "Authenticated users can create assignments" ON public.assignments;
CREATE POLICY "Authenticated users can create assignments" ON public.assignments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Also allow authenticated users to view all courses and assignments for admin dashboard
DROP POLICY IF EXISTS "Authenticated users can view all courses" ON public.courses;
CREATE POLICY "Authenticated users can view all courses" ON public.courses
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view all assignments" ON public.assignments;
CREATE POLICY "Authenticated users can view all assignments" ON public.assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update and delete courses and assignments for admin dashboard
DROP POLICY IF EXISTS "Authenticated users can manage courses" ON public.courses;
CREATE POLICY "Authenticated users can manage courses" ON public.courses
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete courses" ON public.courses;
CREATE POLICY "Authenticated users can delete courses" ON public.courses
    FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage assignments" ON public.assignments;
CREATE POLICY "Authenticated users can manage assignments" ON public.assignments
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON public.assignments;
CREATE POLICY "Authenticated users can delete assignments" ON public.assignments
    FOR DELETE USING (auth.role() = 'authenticated');