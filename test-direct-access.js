const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testDirectAccess() {
  console.log('Testing direct access to user_profiles table...');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Using anon key:', process.env.SUPABASE_ANON_KEY ? 'Yes' : 'No');
  
  try {
    // Test 1: Check if we can access the table at all
    console.log('\n1. Basic table access test...');
    const { data: basicData, error: basicError, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' });
    
    console.log('Basic access result:');
    console.log('- Data:', basicData);
    console.log('- Error:', basicError);
    console.log('- Count:', count);
    
    if (basicError) {
      console.error('❌ Cannot access user_profiles table:', basicError);
      return;
    }
    
    // Test 2: Try to access specific columns that are mentioned in the error
    console.log('\n2. Testing problematic columns...');
    const problematicColumns = ['native_language', 'target_language', 'assessment_completed'];
    
    for (const column of problematicColumns) {
      console.log(`\nTesting column: ${column}`);
      const { data, error } = await supabase
        .from('user_profiles')
        .select(column)
        .limit(1);
      
      if (error) {
        console.error(`❌ Error accessing ${column}:`, error.code, error.message);
        if (error.hint) console.log('Hint:', error.hint);
      } else {
        console.log(`✓ ${column} accessible`);
      }
    }
    
    // Test 3: Check what columns actually exist by trying different variations
    console.log('\n3. Testing column variations...');
    const columnVariations = [
      'target_languages', // plural version
      'preferred_language',
      'learning_level',
      'created_at',
      'updated_at'
    ];
    
    for (const column of columnVariations) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(column)
        .limit(1);
      
      if (error) {
        console.log(`❌ ${column}: ${error.message}`);
      } else {
        console.log(`✓ ${column}: accessible`);
      }
    }
    
    // Test 4: Try to get current user info
    console.log('\n4. Checking current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ No authenticated user:', userError.message);
    } else if (user) {
      console.log('✓ Authenticated user:', user.id, user.email);
      
      // Try to get this user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id);
      
      if (profileError) {
        console.error('❌ Error getting user profile:', profileError);
      } else {
        console.log('✓ User profile:', profileData);
      }
    } else {
      console.log('ℹ️ No user authenticated');
    }
    
    // Test 5: Check table permissions
    console.log('\n5. Testing table permissions...');
    
    // Try a simple count query
    const { count: totalCount, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Cannot count records:', countError);
    } else {
      console.log(`✓ Total records in table: ${totalCount}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDirectAccess();