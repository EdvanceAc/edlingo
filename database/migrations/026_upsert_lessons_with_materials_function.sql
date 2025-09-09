-- Create function to handle lesson creation and updates with materials
CREATE OR REPLACE FUNCTION upsert_lessons_with_materials(
    p_course_id UUID,
    p_lessons JSONB
)
RETURNS TABLE(
    lesson_id UUID,
    lesson_title TEXT,
    materials_count INTEGER,
    operation TEXT
) AS $$
DECLARE
    lesson_record RECORD;
    material_record RECORD;
    term_id UUID;
    existing_lesson_id UUID;
    new_lesson_id UUID;
    material_count INTEGER;
    lesson_operation TEXT;
BEGIN
    -- Get or create a default term for this course
    SELECT id INTO term_id 
    FROM public.terms 
    WHERE course_id = p_course_id 
    ORDER BY order_number 
    LIMIT 1;
    
    -- If no term exists, create a default one
    IF term_id IS NULL THEN
        INSERT INTO public.terms (course_id, name, description, order_number)
        VALUES (p_course_id, 'Course Content', 'Default term for course lessons', 1)
        RETURNING id INTO term_id;
    END IF;
    
    -- Process each lesson
    FOR lesson_record IN 
        SELECT * FROM jsonb_array_elements(p_lessons)
    LOOP
        material_count := 0;
        
        -- Check if this is an update (lesson has an ID)
        IF lesson_record.value ? 'id' AND (lesson_record.value->>'id') != '' THEN
            existing_lesson_id := (lesson_record.value->>'id')::UUID;
            
            -- Update existing lesson
            UPDATE public.lessons 
            SET 
                name = (lesson_record.value->>'title')::TEXT,
                title = (lesson_record.value->>'title')::TEXT,
                description = COALESCE((lesson_record.value->>'description')::TEXT, ''),
                order_number = COALESCE((lesson_record.value->>'order_number')::INTEGER, 0),
                content = lesson_record.value,
                updated_at = NOW()
            WHERE id = existing_lesson_id;
            
            -- Delete existing materials for this lesson
            DELETE FROM public.lesson_materials WHERE lesson_id = existing_lesson_id;
            
            new_lesson_id := existing_lesson_id;
            lesson_operation := 'updated';
        ELSE
            -- Insert new lesson
            INSERT INTO public.lessons (
                term_id,
                name,
                title,
                description,
                order_number,
                level,
                required_xp,
                prerequisites,
                content
            )
            VALUES (
                term_id,
                (lesson_record.value->>'title')::TEXT,
                (lesson_record.value->>'title')::TEXT,
                COALESCE((lesson_record.value->>'description')::TEXT, ''),
                COALESCE((lesson_record.value->>'order_number')::INTEGER, 0),
                'A1', -- Default level, can be enhanced later
                0,
                '[]'::JSONB,
                lesson_record.value
            )
            RETURNING id INTO new_lesson_id;
            
            lesson_operation := 'created';
        END IF;
        
        -- Process materials for this lesson
        IF lesson_record.value ? 'materials' THEN
            FOR material_record IN 
                SELECT * FROM jsonb_array_elements(lesson_record.value->'materials')
            LOOP
                INSERT INTO public.lesson_materials (
                    lesson_id,
                    type,
                    url,
                    content,
                    metadata
                )
                VALUES (
                    new_lesson_id,
                    (material_record.value->>'type')::TEXT,
                    (material_record.value->>'file_url')::TEXT,
                    (material_record.value->>'content')::TEXT,
                    COALESCE(material_record.value->'metadata', '{}'::JSONB)
                );
                
                material_count := material_count + 1;
            END LOOP;
        END IF;
        
        -- Return lesson info
        lesson_id := new_lesson_id;
        lesson_title := (lesson_record.value->>'title')::TEXT;
        materials_count := material_count;
        operation := lesson_operation;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_lessons_with_materials(UUID, JSONB) TO authenticated;