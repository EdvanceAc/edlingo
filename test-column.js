const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testColumn() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Try to add the column directly
    console.log('🔧 Adding assessment_completed column...');
    const { data: alterData, error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false;'
    });
    
    if (alterError) {
      console.error('❌ ALTER TABLE failed:', alterError);
    } else {
      console.log('✅ ALTER TABLE successful');
    }
    
    // Test if we can query the column
    console.log('🔍 Testing column access...');
    const { data: columnData, error: columnError } = await supabase
      .from('user_profiles')
      .select('id, assessment_completed')
      .limit(1);
    
    if (columnError) {
      console.error('❌ Column query failed:', columnError);
    } else {
      console.log('✅ Column query successful:', columnData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testColumn();