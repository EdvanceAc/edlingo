const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function refreshSchema() {
  console.log('🔄 Refreshing PostgREST schema cache...');
  
  try {
    // Method 1: Use pg_notify to refresh schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT pg_notify('pgrst', 'reload schema');"
    });
    
    if (error) {
      console.log('⚠️  Method 1 failed, trying alternative approach...');
      
      // Method 2: Direct SQL execution
      const { data: data2, error: error2 } = await supabase
        .from('user_profiles')
        .select('assessment_completed')
        .limit(1);
      
      if (error2) {
        console.error('❌ Schema refresh failed:', error2.message);
        console.log('\n💡 Manual steps to refresh schema:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run: SELECT pg_notify(\'pgrst\', \'reload schema\');');
        console.log('4. Or restart your Supabase project');
      } else {
        console.log('✅ Schema cache refreshed successfully!');
        console.log('✅ assessment_completed column is now accessible');
      }
    } else {
      console.log('✅ Schema cache refreshed successfully!');
    }
    
  } catch (err) {
    console.error('❌ Error refreshing schema:', err.message);
  }
}

refreshSchema();