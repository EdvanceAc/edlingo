-- Add RLS policies for terms, lessons, lesson_materials, books, and word_highlights

-- Policies for terms
CREATE POLICY "Authenticated users can view terms" ON public.terms
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create terms" ON public.terms
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update terms" ON public.terms
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete terms" ON public.terms
  FOR DELETE TO authenticated
  USING (true);

-- Policies for lessons
CREATE POLICY "Authenticated users can view lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create lessons" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete lessons" ON public.lessons
  FOR DELETE TO authenticated
  USING (true);

-- Policies for lesson_materials
CREATE POLICY "Authenticated users can view lesson_materials" ON public.lesson_materials
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create lesson_materials" ON public.lesson_materials
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lesson_materials" ON public.lesson_materials
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete lesson_materials" ON public.lesson_materials
  FOR DELETE TO authenticated
  USING (true);

-- Policies for books
CREATE POLICY "Authenticated users can view books" ON public.books
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create books" ON public.books
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update books" ON public.books
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete books" ON public.books
  FOR DELETE TO authenticated
  USING (true);

-- Policies for word_highlights
CREATE POLICY "Authenticated users can view word_highlights" ON public.word_highlights
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create word_highlights" ON public.word_highlights
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update word_highlights" ON public.word_highlights
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete word_highlights" ON public.word_highlights
  FOR DELETE TO authenticated
  USING (true);