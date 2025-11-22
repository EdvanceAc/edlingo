import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyXP() {
  console.log('🔍 Checking XP in database...\n');

  const userEmail = 'arkasoftware1@gmail.com';

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === userEmail);

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  // Get user progress
  const { data: progress, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('❌ Error fetching progress:', error.message);
    process.exit(1);
  }

  console.log('📊 Current Database Values:');
  console.log('─'.repeat(50));
  console.log(`   User: ${userEmail}`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Total XP: ${progress.total_xp} XP`);
  console.log(`   Current Level: ${progress.current_level}`);
  console.log(`   Lessons Completed: ${progress.lessons_completed}`);
  console.log(`   Current Streak: ${progress.daily_streak} days`);
  console.log(`   Last Updated: ${progress.updated_at}`);
  console.log('─'.repeat(50));

  if (progress.total_xp === 310) {
    console.log('\n✅ Database has correct XP value (310)!');
    console.log('\n💡 If browser still shows 110 XP:');
    console.log('   1. Clear browser cache: Ctrl+Shift+Delete');
    console.log('   2. Hard refresh: Ctrl+Shift+R');
    console.log('   3. Or close and reopen the app completely');
    console.log('   4. Check browser console for any errors');
  } else {
    console.log(`\n⚠️  Database shows ${progress.total_xp} XP (expected 310)`);
    console.log('   Running sync again...\n');
    
    // Update to correct value
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({ total_xp: 310, current_level: 2, lessons_completed: 3 })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
    } else {
      console.log('✅ Updated to 310 XP!');
    }
  }
}

verifyXP().catch(err => {
  console.error('\n❌ Error:', err.message);
});
