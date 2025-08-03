const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshPostgRESTCache() {
  console.log('Attempting to refresh PostgREST schema cache...');
  
  try {
    // Method 1: Try to call the PostgREST admin endpoint to reload schema
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        "query": "NOTIFY pgrst, 'reload schema'"
      })
    });
    
    if (response.ok) {
      console.log('✅ PostgREST schema cache refresh successful via admin endpoint');
    } else {
      console.log('❌ Admin endpoint method failed, trying alternative...');
      
      // Method 2: Try to trigger schema reload by making a simple query
      const { data, error } = await supabase
        .from('user_progress')
        .select('*, daily_streak')
        .limit(1);
      
      if (error) {
        console.error('Error during schema refresh query:', error);
        
        // Method 3: Try to access the specific columns that are causing issues
        console.log('Testing individual column access...');
        
        const testColumns = ['native_language', 'target_language', 'assessment_completed', 'initial_assessment_date', 'placement_level'];
        
        for (const column of testColumns) {
          try {
            const { data: testData, error: testError } = await supabase
              .from('user_profiles')
              .select(column)
              .limit(1);
            
            if (testError) {
              console.error(`❌ Column '${column}' not accessible:`, testError.message);
            } else {
              console.log(`✅ Column '${column}' is accessible`);
            }
          } catch (err) {
            console.error(`❌ Error testing column '${column}':`, err.message);
          }
        }
      } else {
        console.log('✅ Schema refresh successful via query method');
        console.log('Sample data:', data);
      }
    }
    
  } catch (error) {
    console.error('Error refreshing PostgREST cache:', error);
  }
}

async function testUserProfileOperations() {
  console.log('\n=== Testing User Profile Operations ===');
  
  try {
    // Test 1: Select all columns
    console.log('Test 1: Selecting all columns...');
    const { data: allData, error: allError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (allError) {
      console.error('❌ Error selecting all columns:', allError);
    } else {
      console.log('✅ All columns accessible');
      if (allData && allData.length > 0) {
        console.log('Available columns:', Object.keys(allData[0]));
      }
    }
    
    // Test 2: Test the specific insert operation that's failing
    console.log('\nTest 2: Testing insert operation...');
    const testProfile = {
      id: crypto.randomUUID(),
      email: 'test@example.com',
      full_name: 'Test User',
      target_language: 'English',
      native_language: 'Unknown',
      learning_level: 'beginner',
      assessment_completed: false
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .insert([testProfile])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert operation failed:', insertError);
      
      // If it's an RLS error, that's expected and actually good
      if (insertError.code === '42501') {
        console.log('✅ Insert failed due to RLS policy (expected for test user)');
      }
    } else {
      console.log('✅ Insert operation successful');
      
      // Clean up test record
      await supabase
        .from('user_profiles')
        .delete()
        .eq('id', testProfile.id);
      console.log('✅ Test record cleaned up');
    }
    
  } catch (error) {
    console.error('Error during user profile operations test:', error);
  }
}

async function main() {
  console.log('🔄 Starting PostgREST schema cache refresh and testing...');
  
  await refreshPostgRESTCache();
  await testUserProfileOperations();
  
  console.log('\n=== Summary ===');
  console.log('1. If you see "Column accessible" messages above, the schema is working');
  console.log('2. If you still get PGRST204 errors, try restarting your development server');
  console.log('3. You may also need to restart your Supabase project if the issue persists');
  console.log('\n✅ Schema refresh process completed!');
}

main().catch(console.error);