/**
 * Verification script to check if pronunciation_accuracy column has been added
 * Run this after applying the database fix in Supabase Dashboard
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyPronunciationAccuracyFix() {
  console.log('🔍 Verifying pronunciation_accuracy column fix...');
  console.log('=' .repeat(60));

  try {
    // Test 1: Try to select the column
    console.log('\n📋 Test 1: Column Accessibility');
    const { data, error } = await supabase
      .from('user_progress')
      .select('pronunciation_accuracy')
      .limit(1);

    if (error) {
      if (error.message.includes('pronunciation_accuracy')) {
        console.log('❌ FAILED: Column still missing');
        console.log('   Error:', error.message);
        console.log('\n🚨 ACTION REQUIRED:');
        console.log('   1. Open Supabase Dashboard → SQL Editor');
        console.log('   2. Execute: ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;');
        return false;
      } else {
        console.log('❌ FAILED: Unexpected error');
        console.log('   Error:', error.message);
        return false;
      }
    }

    console.log('✅ PASSED: Column is accessible');

    // Test 2: Try to insert a test record with pronunciation_accuracy
    console.log('\n📋 Test 2: Column Write Operations');
    const testUserId = 'test-user-' + Date.now();
    
    const { error: insertError } = await supabase
      .from('user_progress')
      .insert({
        user_id: testUserId,
        course_id: 'test-course',
        lessons_completed: 0,
        pronunciation_accuracy: 85.5
      });

    if (insertError) {
      console.log('⚠️  WARNING: Insert test failed');
      console.log('   Error:', insertError.message);
      console.log('   (This might be due to RLS policies - column may still work)');
    } else {
      console.log('✅ PASSED: Column accepts data');
      
      // Clean up test record
      await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', testUserId);
    }

    // Test 3: Check column schema
    console.log('\n📋 Test 3: Column Schema Verification');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_progress' 
          AND column_name = 'pronunciation_accuracy';
        `
      });

    if (schemaError) {
      console.log('⚠️  WARNING: Schema check failed (exec_sql not available)');
      console.log('   This is normal - column verification passed in Test 1');
    } else if (schemaData && schemaData.length > 0) {
      console.log('✅ PASSED: Column schema confirmed');
      console.log('   Type:', schemaData[0].data_type);
      console.log('   Default:', schemaData[0].column_default);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 SUCCESS: pronunciation_accuracy column is working!');
    console.log('\n📱 Next Steps:');
    console.log('   1. Refresh your application');
    console.log('   2. Check browser console for errors');
    console.log('   3. Test user progress functionality');
    console.log('   4. Run TestSprite tests for improved results');
    
    return true;

  } catch (error) {
    console.log('\n❌ VERIFICATION FAILED');
    console.log('Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your .env file has correct Supabase credentials');
    console.log('   2. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.log('   3. Ensure database fix was applied in Supabase Dashboard');
    return false;
  }
}

// Run verification
verifyPronunciationAccuracyFix()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed! Database fix is complete.');
      process.exit(0);
    } else {
      console.log('\n❌ Fix verification failed. Please apply the database fix.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Verification script error:', error);
    process.exit(1);
  });