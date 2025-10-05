-- Drop existing misconfigured policies
DROP POLICY IF EXISTS "Authenticated users can create courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can view all courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete their courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update their courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;

-- Recreate with correct roles
CREATE POLICY "Authenticated users can create courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete courses" ON public.courses
  FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all courses" ON public.courses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Instructors can delete their courses" ON public.courses
  FOR DELETE TO authenticated
  USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update their courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (auth.uid() = instructor_id);

-- Retain public view policy if needed
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT TO public
  USING (is_active = true);