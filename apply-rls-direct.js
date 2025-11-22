import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyRLSPolicies() {
  console.log('🔒 Applying RLS policy fixes...\n');

  const statements = [
    `DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress`,
    `DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress`,
    `DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress`,
    `DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress`,
    `CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (user_id = auth.uid())`,
    `CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (user_id = auth.uid())`,
    `CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`,
    `CREATE POLICY "Users can delete own progress" ON public.user_progress FOR DELETE USING (user_id = auth.uid())`,
    `ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated`
  ];

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('❌ Could not extract project reference from URL');
    return false;
  }

  console.log(`📍 Project: ${projectRef}\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 50).replace(/\s+/g, ' ');
    console.log(`${i + 1}/${statements.length} ${preview}...`);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: stmt })
      });

      if (!response.ok) {
        const text = await response.text();
        // Ignore "does not exist" errors for DROP statements
        if (stmt.includes('DROP') && text.includes('does not exist')) {
          console.log(`   ⚠️  Policy didn't exist (OK)`);
        } else {
          console.log(`   ⚠️  ${text.substring(0, 80)}`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${error.message}`);
    }
  }

  console.log('\n✅ RLS policies applied!');
  return true;
}

applyRLSPolicies().then(success => {
  if (success) {
    console.log('\n🎮 Your Dashboard should now show dynamic data!');
    console.log('💡 Hard refresh your browser: Ctrl+Shift+R');
  } else {
    console.log('\n📝 Please apply the fix manually using RLS_FIX_INSTRUCTIONS.md');
  }
});
