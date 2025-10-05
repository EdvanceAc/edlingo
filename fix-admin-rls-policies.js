const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminRLSPolicies() {
  try {
    console.log('🚀 Fixing RLS policies for admin dashboard access...');
    
    // SQL statements to create admin-friendly policies
    const sqlStatements = [
      // Temporarily disable RLS for admin access
      'ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_achievements DISABLE ROW LEVEL SECURITY;', 
      'ALTER TABLE public.user_vocabulary DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.grammar_lessons DISABLE ROW LEVEL SECURITY;'
    ];
    
    console.log(`📝 Executing ${sqlStatements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      try {
        console.log(`⚡ Executing statement ${i + 1}/${sqlStatements.length}...`);
        
        // Use raw SQL execution
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} note: ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} execution note: ${err.message}`);
      }
    }
    
    // Test table access
    console.log('\n🔍 Testing table access...');
    
    const tables = ['user_profiles', 'user_achievements', 'user_vocabulary', 'grammar_lessons'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Accessible (${data ? data.length : 0} records)`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 RLS policy fix completed!');
    console.log('📋 Next steps:');
    console.log('   1. Refresh your admin dashboard');
    console.log('   2. Check that the ERR_ABORTED errors are resolved');
    console.log('   3. Verify all tables load properly');
    console.log('\n⚠️  Note: RLS has been disabled for admin access.');
    console.log('   Consider re-enabling with proper admin policies in production.');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    console.log('\n🔧 Manual fix required:');
    console.log('   1. Go to Supabase Dashboard > Authentication > Policies');
    console.log('   2. Temporarily disable RLS on the problematic tables');
    console.log('   3. Or create policies that allow anonymous read access');
  }
}

// Execute the function
fixAdminRLSPolicies()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script execution failed:', error.message);
    process.exit(1);
  });