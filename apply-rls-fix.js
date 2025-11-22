import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFix() {
  console.log('🔒 Fixing RLS policies for user_progress table...\n');

  const sql = readFileSync('fix-rls-policies.sql', 'utf-8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;
    
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
    console.log(`${i + 1}. ${preview}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
    
    if (error && !error.message.includes('does not exist')) {
      console.log(`   ⚠️  ${error.message}`);
    } else {
      console.log(`   ✅ Success`);
    }
  }

  console.log('\n✅ RLS policies updated!');
  console.log('\n🎮 Now users can access their own progress data.');
  console.log('💡 Hard refresh your browser to see the changes.');
}

applyRLSFix().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.log('\n📝 Please run the SQL manually:');
  console.log('   1. Open Supabase Dashboard → SQL Editor');
  console.log('   2. Copy and run: fix-rls-policies.sql');
});
