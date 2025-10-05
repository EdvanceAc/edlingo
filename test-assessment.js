require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testAssessmentColumn() {
  console.log('🔍 Testing assessment_completed column access...');
  
  try {
    // Try to select from user_profiles with assessment_completed
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, assessment_completed')
      .limit(1);
    
    if (error) {
      console.log('❌ Error accessing assessment_completed:', error);
      return;
    }
    
    console.log('✅ Successfully accessed assessment_completed column');
    console.log('Data:', data);
    
    // Try to insert a test record
    console.log('\n🔧 Testing insert with assessment_completed...');
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        email: 'test@example.com',
        assessment_completed: false
      })
      .select();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up - delete the test record
      await supabase
        .from('user_profiles')
        .delete()
        .eq('email', 'test@example.com');
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (err) {
    console.log('❌ Unexpected error:', err);
  }
}

testAssessmentColumn();