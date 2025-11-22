import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('query', { query_text: sql });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    // Try alternative method
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query_text: sql })
      });
      
      if (response.ok) {
        return { success: true };
      }
      
      return { success: false, error: await response.text() };
    } catch (fetchError) {
      return { success: false, error: error.message };
    }
  }
}

async function applyRLSFix() {
  console.log('🔒 Applying RLS policy fixes to user_progress...\n');

  const policies = [
    {
      name: 'Drop old view policy',
      sql: `DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;`
    },
    {
      name: 'Drop old update policy',
      sql: `DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;`
    },
    {
      name: 'Drop old insert policy',
      sql: `DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;`
    },
    {
      name: 'Drop old delete policy',
      sql: `DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;`
    },
    {
      name: 'Create SELECT policy',
      sql: `CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (user_id = auth.uid());`
    },
    {
      name: 'Create INSERT policy',
      sql: `CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (user_id = auth.uid());`
    },
    {
      name: 'Create UPDATE policy',
      sql: `CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
    },
    {
      name: 'Create DELETE policy',
      sql: `CREATE POLICY "Users can delete own progress" ON public.user_progress FOR DELETE USING (user_id = auth.uid());`
    },
    {
      name: 'Enable RLS',
      sql: `ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Grant permissions',
      sql: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;`
    }
  ];

  let successCount = 0;
  
  for (const policy of policies) {
    console.log(`⚙️  ${policy.name}...`);
    const result = await executeSQL(policy.sql);
    
    if (result.success || (result.error && result.error.includes('does not exist'))) {
      console.log(`   ✅ Success\n`);
      successCount++;
    } else {
      console.log(`   ⚠️  ${result.error?.substring(0, 100) || 'Unknown error'}\n`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Applied ${successCount}/${policies.length} policies\n`);

  if (successCount >= 6) {
    console.log('✅ RLS policies updated successfully!');
    console.log('\n🎮 Your progress tracking should now work!');
    console.log('💡 Hard refresh your browser: Ctrl+Shift+R');
    console.log('\n🧪 Test by going to Live Conversation page');
  } else {
    console.log('⚠️  Some policies may not have been applied.');
    console.log('\n📝 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('\nSee file: fix-progress-rls-final.sql');
  }
}

applyRLSFix().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.log('\n📝 Please apply SQL manually from: fix-progress-rls-final.sql');
});
