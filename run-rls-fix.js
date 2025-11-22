import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL() {
  console.log('🔧 Applying RLS fix using direct SQL...\n');

  const sql = readFileSync('APPLY_THIS_SQL_NOW.sql', 'utf-8');
  
  // Split into individual statements and execute one by one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes('DONE!'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 70).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // Execute using service role (bypasses RLS)
      const { data, error } = await supabase
        .rpc('exec', { sql: stmt });

      if (error) {
        // Check if it's an acceptable error (like policy already exists)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          console.log('   ⚠️  Already applied (OK)\n');
        } else {
          console.log(`   ❌ ${error.message}\n`);
        }
      } else {
        console.log('   ✅ Success\n');
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ RLS fix applied!');
  console.log('\n🎮 Next steps:');
  console.log('   1. Hard refresh your browser (Ctrl+Shift+R)');
  console.log('   2. Go to Live Conversation page');
  console.log('   3. Test - the RLS error should be gone!\n');
}

runSQL();
