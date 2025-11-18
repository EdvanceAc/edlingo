-- Enable RLS on courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow teachers to insert" ON courses FOR INSERT WITH CHECK (auth.role() = 'teacher');
CREATE POLICY "Allow teachers to update" ON courses FOR UPDATE USING (auth.role() = 'teacher');

-- Enable RLS on lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read based on progress" ON lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_progress WHERE user_id = auth.uid() AND course_id = lessons.course_id AND (required_progress <= (user_progress ->> 'progress')::integer))
);
CREATE POLICY "Allow teachers to manage" ON lessons FOR ALL USING (auth.role() = 'teacher');

-- Enable RLS on assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to access own assessments" ON assessments FOR ALL USING (user_id = auth.uid());