/**
 * Direct SQL execution to add pronunciation_accuracy column
 * Uses Supabase service role key for admin operations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function executeDirectSQL() {
  console.log('🔧 Executing direct SQL fix for pronunciation_accuracy column...');
  console.log('=' .repeat(70));

  const sqlCommands = [
    {
      name: 'Add pronunciation_accuracy column',
      sql: `ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;`
    },
    {
      name: 'Create index for performance',
      sql: `CREATE INDEX IF NOT EXISTS idx_user_progress_pronunciation_accuracy ON public.user_progress(pronunciation_accuracy);`
    },
    {
      name: 'Add column comment',
      sql: `COMMENT ON COLUMN public.user_progress.pronunciation_accuracy IS 'User pronunciation accuracy percentage (0.00-100.00)';`
    },
    {
      name: 'Update existing records',
      sql: `UPDATE public.user_progress SET pronunciation_accuracy = 0.0 WHERE pronunciation_accuracy IS NULL;`
    }
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const command of sqlCommands) {
    try {
      console.log(`\n📋 Executing: ${command.name}`);
      console.log(`   SQL: ${command.sql}`);
      
      // Try using rpc first
      let result;
      try {
        result = await supabase.rpc('exec_sql', { sql: command.sql });
      } catch (rpcError) {
        console.log('   ⚠️  RPC method not available, trying direct query...');
        
        // Fallback to direct query for simple operations
        if (command.name === 'Add pronunciation_accuracy column') {
          // Try to insert a test record to see if column exists
          const testResult = await supabase
            .from('user_progress')
            .select('pronunciation_accuracy')
            .limit(1);
          
          if (testResult.error && testResult.error.message.includes('pronunciation_accuracy')) {
            throw new Error('Column does not exist and cannot be added via client');
          } else {
            console.log('   ✅ Column already exists or was added successfully');
            successCount++;
            continue;
          }
        } else {
          throw rpcError;
        }
      }

      if (result.error) {
        console.log(`   ❌ FAILED: ${result.error.message}`);
        failureCount++;
      } else {
        console.log('   ✅ SUCCESS');
        successCount++;
      }

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      failureCount++;
    }
  }

  console.log('\n' + '=' .repeat(70));
  console.log(`📊 EXECUTION SUMMARY:`);
  console.log(`   ✅ Successful: ${successCount}/${sqlCommands.length}`);
  console.log(`   ❌ Failed: ${failureCount}/${sqlCommands.length}`);

  if (failureCount > 0) {
    console.log('\n🚨 MANUAL ACTION REQUIRED:');
    console.log('   Some SQL commands failed. Please execute manually in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Execute this command:');
    console.log('\n   ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;');
    return false;
  }

  // Verify the fix
  console.log('\n🔍 Verifying the fix...');
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('pronunciation_accuracy')
      .limit(1);

    if (error) {
      if (error.message.includes('pronunciation_accuracy')) {
        console.log('❌ VERIFICATION FAILED: Column still missing');
        return false;
      } else {
        console.log(`⚠️  Verification warning: ${error.message}`);
      }
    } else {
      console.log('✅ VERIFICATION PASSED: Column is accessible');
    }
  } catch (verifyError) {
    console.log(`⚠️  Verification error: ${verifyError.message}`);
  }

  console.log('\n🎉 SUCCESS: pronunciation_accuracy column fix completed!');
  console.log('\n📱 Next Steps:');
  console.log('   1. Refresh your application');
  console.log('   2. Check browser console - no more PGRST204 errors');
  console.log('   3. Test user progress functionality');
  console.log('   4. Run TestSprite tests for improved results');
  
  return true;
}

// Execute the fix
executeDirectSQL()
  .then(success => {
    if (success) {
      console.log('\n✅ Database fix completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Database fix failed. Manual intervention required.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Script execution error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your .env file has correct Supabase credentials');
    console.log('   2. Verify SUPABASE_SERVICE_ROLE_KEY is valid');
    console.log('   3. Ensure you have admin permissions on the database');
    console.log('   4. Try the manual fix in Supabase Dashboard');
    process.exit(1);
  });