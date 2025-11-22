import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserMapping() {
  console.log('🔍 Checking user ID mapping...\n');

  // Get all auth users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError || !users) {
    console.error('❌ Error fetching users:', usersError?.message);
    return;
  }

  console.log(`Found ${users.length} auth user(s):\n`);

  for (const user of users) {
    console.log(`👤 Email: ${user.email}`);
    console.log(`   Auth ID: ${user.id}`);
    
    // Check user_profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .eq('user_id', user.id);
    
    if (profiles && profiles.length > 0) {
      console.log(`   Profile ID: ${profiles[0].id}`);
      console.log(`   Profile user_id: ${profiles[0].user_id}`);
    } else {
      console.log(`   ⚠️  No user_profile found`);
    }
    
    // Check user_progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('user_id, total_xp, daily_streak, daily_progress')
      .eq('user_id', user.id);
    
    if (progress && progress.length > 0) {
      console.log(`   ✅ Progress found: ${progress[0].total_xp} XP, ${progress[0].daily_streak} streak`);
    } else {
      console.log(`   ⚠️  No user_progress found for auth.id`);
    }
    
    console.log('');
  }
}

checkUserMapping();
