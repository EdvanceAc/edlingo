-- Create function to get course lessons with materials for frontend
-- This function returns lessons and their materials in a flattened format for JavaScript processing

CREATE OR REPLACE FUNCTION get_course_lessons_with_materials(
    p_course_id UUID
)
RETURNS TABLE(
    lesson_id UUID,
    lesson_title TEXT,
    lesson_description TEXT,
    lesson_order INTEGER,
    lesson_type TEXT,
    duration_minutes INTEGER,
    difficulty_level TEXT,
    learning_objectives TEXT[],
    is_published BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    material_id UUID,
    material_type TEXT,
    material_content TEXT,
    material_order INTEGER,
    file_url TEXT,
    file_size BIGINT,
    file_type TEXT,
    duration INTEGER,
    metadata JSONB
) AS $$
BEGIN
    -- Check if we have lessons from terms structure or direct course lessons
    RETURN QUERY
    SELECT 
        l.id as lesson_id,
        COALESCE(l.title, l.name) as lesson_title,
        l.description as lesson_description,
        COALESCE(l.order_number, l.order_index, 0) as lesson_order,
        l.lesson_type,
        l.duration_minutes,
        l.difficulty_level,
        l.learning_objectives,
        l.is_published,
        l.created_at,
        l.updated_at,
        lm.id as material_id,
        lm.type as material_type,
        lm.content as material_content,
        0 as material_order, -- Default order for materials
        lm.url as file_url,
        NULL::BIGINT as file_size, -- Not available in current schema
        NULL::TEXT as file_type,   -- Not available in current schema
        NULL::INTEGER as duration, -- Not available in current schema
        lm.metadata
    FROM 
        public.lessons l
    LEFT JOIN 
        public.lesson_materials lm ON l.id = lm.lesson_id
    LEFT JOIN 
        public.terms t ON l.term_id = t.id
    WHERE 
        -- Handle both direct course lessons and term-based lessons
        (l.course_id = p_course_id OR t.course_id = p_course_id)
    ORDER BY 
        COALESCE(l.order_number, l.order_index, 0), 
        l.created_at,
        lm.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_course_lessons_with_materials(UUID) TO authenticated;

-- Create indexes to optimize the function performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_term_id ON public.lessons(term_id);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_id ON public.lesson_materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_terms_course_id ON public.terms(course_id);

-- Add helpful comments
COMMENT ON FUNCTION get_course_lessons_with_materials(UUID) IS 'Returns all lessons and their materials for a given course, handling both term-based and direct course lessons';