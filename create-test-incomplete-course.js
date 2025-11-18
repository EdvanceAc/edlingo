require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with remote credentials (Service Role bypasses RLS in Node scripts)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createIncompleteTestCourse() {
  console.log('🚀 Creating test course with incomplete hierarchy...');
  
  try {
    // Create a course with minimal data to simulate incomplete hierarchy
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert([{
        title: 'Incomplete Test Course',
        description: 'This course has been created for testing incomplete hierarchy loading',
        language: 'English',
        cefr_level: 'A1',
        is_active: true
      }])
      .select()
      .single();
      
    if (courseError) {
      console.error('❌ Error creating course:', courseError.message, courseError.details || '');
      return;
    }
    
    console.log('✅ Test course created successfully!');
    console.log('   Course ID:', course.id);
    console.log('   Title:', course.title);
    
    // Create only one term (incomplete hierarchy - missing lessons/materials)
    const { error: termError } = await supabase
      .from('terms')
      .insert([{
        course_id: course.id,
        name: 'Test Term 1',
        description: 'First term with no lessons',
        order_number: 0
      }]);
      
    if (termError) {
      console.warn('⚠️  Could not create term (table might not exist or policy issue):', termError.message);
    } else {
      console.log('✅ Created one term (incomplete - no lessons)');
    }
    
    // Intentionally NOT creating lessons or materials to simulate incomplete hierarchy
    console.log('');
    console.log('🎯 Test course setup complete:');
    console.log('   ✅ Course created');
    console.log('   ⚠️  Term created (but no lessons)');
    console.log('   ❌ No lessons created (incomplete hierarchy)');
    console.log('   ❌ No materials created (incomplete hierarchy)');
    console.log('');
    console.log('📝 This course can be used to test error handling in the admin dashboard.');
    console.log('   Access the admin dashboard at: http://localhost:8001/');
    console.log('   Look for "Incomplete Test Course" to test hierarchy loading.');
    
    return course.id;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
createIncompleteTestCourse();