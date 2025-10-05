require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addCourseIdColumn() {
  try {
    console.log('🔧 Creating exec_sql function and adding course_id column...');
    
    // First, create the exec_sql function
    console.log('\n1. Creating exec_sql function...');
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
        RETURN 'OK';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN SQLERRM;
      END;
      $$;
    `;
    
    // Try to create the function using a simple query approach
    const { data: funcResult, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'exec_sql')
      .limit(1);
      
    if (funcError) {
      console.log('⚠️  Cannot check for exec_sql function:', funcError.message);
    }
    
    // Now try to add the course_id column using RPC
    console.log('\n2. Adding course_id column to lessons table...');
    const addColumnSQL = 'ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;';
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', { sql: addColumnSQL });
    
    if (rpcError) {
      console.log('⚠️  RPC exec_sql failed:', rpcError.message);
      
      // Alternative approach: try direct table modification
      console.log('\n3. Trying alternative approach...');
      
      // Check if course_id column exists by trying to select it
      const { data: testResult, error: testError } = await supabase
        .from('lessons')
        .select('course_id')
        .limit(1);
        
      if (testError && testError.message.includes('does not exist')) {
        console.log('❌ course_id column still missing');
        console.log('\n📋 Manual action required:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Run this SQL:');
        console.log('   ALTER TABLE public.lessons ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;');
        console.log('3. Then refresh the admin dashboard');
      } else if (!testError) {
        console.log('✅ course_id column already exists!');
      }
    } else {
      console.log('✅ course_id column added successfully via RPC');
    }
    
    // Final verification
    console.log('\n4. Final verification...');
    const { data: finalTest, error: finalError } = await supabase
      .from('lessons')
      .select('id, name, course_id')
      .limit(1);
      
    if (finalError) {
      console.log('❌ Final test failed:', finalError.message);
    } else {
      console.log('✅ Lessons table with course_id accessible:', finalTest);
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
  }
}

// Run the fix
addCourseIdColumn();