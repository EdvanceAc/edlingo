const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixSchema() {
  console.log('Checking and fixing user_profiles schema...');
  
  try {
    // First, let's check what columns exist
    console.log('\n1. Checking existing columns...');
    const { data: columns, error: columnError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (columnError) {
      console.error('Error checking columns:', columnError);
    } else {
      console.log('Existing columns:', columns);
    }
    
    // Add missing columns if they don't exist
    console.log('\n2. Adding missing columns...');
    const alterQueries = [
      'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT false;',
      'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT \'English\';',
      'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS native_language TEXT DEFAULT \'Unknown\';',
      'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS initial_assessment_date TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS placement_level TEXT;'
    ];
    
    for (const query of alterQueries) {
      console.log('Executing:', query);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('Error executing query:', error);
      } else {
        console.log('✓ Query executed successfully');
      }
    }
    
    // Update existing records
    console.log('\n3. Updating existing records...');
    const updateQuery = `
      UPDATE public.user_profiles 
      SET 
        assessment_completed = COALESCE(assessment_completed, false),
        target_language = COALESCE(target_language, 'English'),
        native_language = COALESCE(native_language, 'Unknown')
      WHERE assessment_completed IS NULL OR target_language IS NULL OR native_language IS NULL;
    `;
    
    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateQuery });
    if (updateError) {
      console.error('Error updating records:', updateError);
    } else {
      console.log('✓ Records updated successfully');
    }
    
    // Create indexes
    console.log('\n4. Creating indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_assessment_completed ON public.user_profiles(assessment_completed);',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_target_language ON public.user_profiles(target_language);'
    ];
    
    for (const query of indexQueries) {
      console.log('Executing:', query);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('Error creating index:', error);
      } else {
        console.log('✓ Index created successfully');
      }
    }
    
    // Test column access
    console.log('\n5. Testing column access...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('id, assessment_completed, target_language, native_language')
      .limit(1);
    
    if (testError) {
      console.error('Error testing column access:', testError);
    } else {
      console.log('✓ Column access test successful:', testData);
    }
    
    // Refresh schema cache
    console.log('\n6. Refreshing schema cache...');
    const { error: notifyError } = await supabase.rpc('exec_sql', {
      sql: "SELECT pg_notify('pgrst', 'reload schema');"
    });
    
    if (notifyError) {
      console.error('Error refreshing schema cache:', notifyError);
    } else {
      console.log('✓ Schema cache refresh initiated');
    }
    
    console.log('\n✅ Schema fix completed!');
    console.log('\nNext steps:');
    console.log('1. Restart your development server (npm run dev)');
    console.log('2. If the issue persists, restart your Supabase project from the dashboard');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixSchema();