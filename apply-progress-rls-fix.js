import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('\n📝 Please run this SQL manually in Supabase Dashboard:');
  console.log('   File: fix-progress-rls-final.sql');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('🔒 Fixing user_progress RLS policies...\n');

  const sql = readFileSync('fix-progress-rls-final.sql', 'utf-8');
  
  // Split into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;

    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    console.log(`${i + 1}/${statements.length} ${preview}...`);

    try {
      // Try direct query
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      
      if (error) {
        // Acceptable errors for DROP IF EXISTS
        if (stmt.includes('DROP POLICY IF EXISTS') && error.message.includes('does not exist')) {
          console.log('   ⚠️  Policy didn\'t exist (OK)');
          successCount++;
        } else {
          console.log(`   ❌ ${error.message.substring(0, 80)}`);
          errorCount++;
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ ${err.message.substring(0, 80)}`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some statements failed. This might be OK if they were DROP statements.');
    console.log('📝 To apply manually:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: fix-progress-rls-final.sql');
    console.log('   3. Click Run\n');
  } else {
    console.log('✅ All RLS policies updated successfully!\n');
    console.log('🎮 Your progress tracking should now work!');
    console.log('💡 Hard refresh your browser: Ctrl+Shift+R\n');
  }
}

applyFix().catch(err => {
  console.error('\n❌ Script error:', err.message);
  console.log('\n📝 Please apply the SQL manually from: fix-progress-rls-final.sql');
});
