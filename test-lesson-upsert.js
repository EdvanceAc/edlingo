const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testLessonUpsert() {
  try {
    console.log('Testing lesson upsert functionality...');
    
    // First, get an existing course to test with
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .limit(1);
    
    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return;
    }
    
    if (!courses || courses.length === 0) {
      console.log('No courses found. Creating a test course first...');
      
      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert({
          title: 'Test Course for Lesson Upsert',
          description: 'A test course to verify lesson upsert functionality',
          cefr_level: 'A1',
          category: 'test',
          language: 'English',
          duration: 30,
          hours: 2
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating test course:', createError);
        return;
      }
      
      courses.push(newCourse);
    }
    
    const courseId = courses[0].id;
    console.log(`Using course: ${courses[0].title} (${courseId})`);
    
    // Test data for lessons
    const lessonsData = [
      {
        title: 'Introduction to Basics',
        description: 'Learn the fundamentals',
        order_number: 1,
        materials: [
          {
            type: 'text',
            content: 'Welcome to the course!',
            metadata: { duration: 5 }
          },
          {
            type: 'image',
            file_url: 'https://example.com/image1.jpg',
            content: 'Course overview image',
            metadata: { alt_text: 'Course overview' }
          }
        ]
      },
      {
        title: 'Advanced Concepts',
        description: 'Dive deeper into the subject',
        order_number: 2,
        materials: [
          {
            type: 'video',
            file_url: 'https://example.com/video1.mp4',
            content: 'Advanced tutorial video',
            metadata: { duration: 600, resolution: '1080p' }
          }
        ]
      }
    ];
    
    // Test 1: Create new lessons
    console.log('\n=== Test 1: Creating new lessons ===');
    const { data: createResult, error: createError } = await supabase
      .rpc('upsert_lessons_with_materials', {
        p_course_id: courseId,
        p_lessons: lessonsData
      });
    
    if (createError) {
      console.error('Error creating lessons:', createError);
      return;
    }
    
    console.log('Created lessons:', createResult);
    
    // Test 2: Update existing lessons
    console.log('\n=== Test 2: Updating existing lessons ===');
    
    // Modify the lessons data to include IDs from the creation result
    const updatedLessonsData = lessonsData.map((lesson, index) => ({
      ...lesson,
      id: createResult[index].lesson_id,
      title: lesson.title + ' (Updated)',
      description: lesson.description + ' - This lesson has been updated.',
      materials: [
        ...lesson.materials,
        {
          type: 'text',
          content: 'This is additional content added during update',
          metadata: { added_during: 'update' }
        }
      ]
    }));
    
    const { data: updateResult, error: updateError } = await supabase
      .rpc('upsert_lessons_with_materials', {
        p_course_id: courseId,
        p_lessons: updatedLessonsData
      });
    
    if (updateError) {
      console.error('Error updating lessons:', updateError);
      return;
    }
    
    console.log('Updated lessons:', updateResult);
    
    // Test 3: Verify the lessons were updated correctly
    console.log('\n=== Test 3: Verifying lesson updates ===');
    
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        description,
        order_number,
        lesson_materials (
          id,
          type,
          url,
          content,
          metadata
        )
      `)
      .eq('term_id', (await supabase
        .from('terms')
        .select('id')
        .eq('course_id', courseId)
        .single()
      ).data.id);
    
    if (fetchError) {
      console.error('Error fetching lessons:', fetchError);
      return;
    }
    
    console.log('Final lessons in database:');
    lessons.forEach(lesson => {
      console.log(`- ${lesson.title}`);
      console.log(`  Description: ${lesson.description}`);
      console.log(`  Materials: ${lesson.lesson_materials.length}`);
      lesson.lesson_materials.forEach(material => {
        console.log(`    * ${material.type}: ${material.content?.substring(0, 50)}...`);
      });
    });
    
    console.log('\n✅ Lesson upsert functionality test completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testLessonUpsert();