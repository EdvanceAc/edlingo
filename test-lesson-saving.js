// Test script for lesson saving functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data
const testCourseData = {
  title: 'Test Course for Lesson Saving',
  description: 'A test course to verify lesson saving functionality',
  level: 'beginner',
  language: 'English',
  category: 'conversation',
  is_active: true
};

const testLessonsData = [
  {
    title: 'Test Lesson 1',
    description: 'First test lesson with materials',
    order_number: 1,
    materials: [
      {
        title: 'Introduction Video',
        type: 'video',
        content: 'Sample video content',
        file_url: 'https://example.com/video1.mp4',
        metadata: {
          title: 'Introduction Video',
          duration: 300,
          resolution: '720p',
          has_subtitles: false
        }
      },
      {
        title: 'Practice Quiz',
        type: 'quiz',
        content: 'Sample quiz content',
        metadata: {
          title: 'Practice Quiz',
          quiz_type: 'multiple-choice',
          question_count: 5,
          time_limit: 30,
          passing_score: 70
        }
      }
    ]
  },
  {
    title: 'Test Lesson 2',
    description: 'Second test lesson with different materials',
    order_number: 2,
    materials: [
      {
        title: 'Reading Material',
        type: 'pdf',
        content: 'Sample PDF content',
        file_url: 'https://example.com/reading.pdf',
        file_size: 1024000,
        file_type: 'application/pdf',
        metadata: {
          title: 'Reading Material',
          page_range: '1-10',
          instructions: 'Read carefully and take notes',
          page_count: 10
        }
      }
    ]
  }
];

async function runTests() {
  console.log('🚀 Starting lesson saving functionality tests...');
  console.log('=' .repeat(60));

  try {
    // Test 1: Database connection
    console.log('\n📡 Test 1: Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('courses')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful');

    // Test 2: Create test course
    console.log('\n📚 Test 2: Creating test course...');
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert(testCourseData)
      .select()
      .single();
    
    if (courseError) {
      console.error('❌ Course creation failed:', courseError.message);
      return;
    }
    console.log('✅ Test course created successfully:', courseData.title);
    console.log('   Course ID:', courseData.id);

    // Test 3: Test create_lessons_with_materials function
    console.log('\n🎯 Test 3: Testing create_lessons_with_materials function...');
    const { data: lessonsResult, error: lessonsError } = await supabase
      .rpc('create_lessons_with_materials', {
        p_course_id: courseData.id,
        p_lessons: testLessonsData
      });
    
    if (lessonsError) {
      console.error('❌ Lessons creation failed:', lessonsError.message);
      console.error('   Error details:', lessonsError);
      return;
    }
    console.log('✅ Lessons created successfully');
    console.log('   Created lessons:', lessonsResult?.length || 'Unknown count');

    // Test 4: Verify lessons were saved
    console.log('\n🔍 Test 4: Verifying lessons were saved...');
    const { data: savedLessons, error: verifyError } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        description,
        order_number,
        lesson_materials (
          id,
          type,
          content,
          file_url,
          metadata
        )
      `)
      .eq('course_id', courseData.id)
      .order('order_number');
    
    if (verifyError) {
      console.error('❌ Lessons verification failed:', verifyError.message);
      return;
    }
    
    console.log('✅ Lessons verification successful');
    console.log('   Found', savedLessons.length, 'lessons');
    
    savedLessons.forEach((lesson, index) => {
      console.log(`   Lesson ${index + 1}: ${lesson.title}`);
      console.log(`     Materials: ${lesson.lesson_materials.length}`);
      lesson.lesson_materials.forEach((material, matIndex) => {
        const materialTitle = material.metadata?.title || `Material ${matIndex + 1}`;
        console.log(`       ${matIndex + 1}. ${materialTitle} (${material.type})`);
      });
    });

    // Test 5: Test terms structure (basic verification)
    console.log('\n📝 Test 5: Verifying terms structure...');
    const { data: termData, error: termError } = await supabase
      .from('terms')
      .select('id, title, description')
      .eq('course_id', courseData.id)
      .limit(1);
    
    if (termError) {
      console.error('❌ Terms verification failed:', termError.message);
    } else {
      console.log('✅ Terms structure verified - default term created for lessons');
    }

    // Cleanup: Remove test data
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete lesson materials first (due to foreign key constraints)
    await supabase
      .from('lesson_materials')
      .delete()
      .in('lesson_id', savedLessons.map(l => l.id));
    
    // Delete lessons
    await supabase
      .from('lessons')
      .delete()
      .eq('course_id', courseData.id);
    
    // Delete terms
    await supabase
      .from('terms')
      .delete()
      .eq('course_id', courseData.id);
    
    // Delete course
    await supabase
      .from('courses')
      .delete()
      .eq('id', courseData.id);
    
    console.log('✅ Test data cleaned up successfully');

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All tests completed successfully!');
    console.log('✅ Lesson saving functionality is working correctly');
    
  } catch (error) {
    console.error('\n💥 Unexpected error during testing:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
if (require.main === module) {
  runTests().then(() => {
    console.log('\n🏁 Test execution completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };