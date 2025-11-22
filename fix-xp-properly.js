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

async function fixXP() {
  console.log('🔧 Fixing XP value in database...\n');

  const userEmail = 'arkasoftware1@gmail.com';

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === userEmail);

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  // Check current value
  const { data: current } = await supabase
    .from('user_progress')
    .select('total_xp, lessons_completed, current_level')
    .eq('user_id', user.id)
    .single();

  console.log('📊 Current Database Values:');
  console.log(`   Total XP: ${current.total_xp}`);
  console.log(`   Lessons Completed: ${current.lessons_completed}`);
  console.log(`   Current Level: ${current.current_level}\n`);

  // Calculate correct XP
  // 3 lessons completed × 75 XP each = 225 XP
  // Plus any existing XP from other activities
  const lessonXP = 3 * 75; // 225 XP from lessons
  const correctTotalXP = 310; // Your header + lesson XP
  const correctLevel = Math.floor(Math.sqrt(correctTotalXP / 100)) + 1;

  console.log('✅ Updating to correct values:');
  console.log(`   Total XP: ${correctTotalXP} (includes ${lessonXP} from lessons)`);
  console.log(`   Lessons Completed: 3`);
  console.log(`   Current Level: ${correctLevel}\n`);

  // Update with force
  const { error } = await supabase
    .from('user_progress')
    .update({
      total_xp: correctTotalXP,
      lessons_completed: 3,
      current_level: correctLevel,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }

  // Verify
  const { data: updated } = await supabase
    .from('user_progress')
    .select('total_xp, lessons_completed, current_level')
    .eq('user_id', user.id)
    .single();

  console.log('✅ VERIFIED - Database now has:');
  console.log(`   Total XP: ${updated.total_xp}`);
  console.log(`   Lessons Completed: ${updated.lessons_completed}`);
  console.log(`   Current Level: ${updated.current_level}\n`);

  if (updated.total_xp === correctTotalXP) {
    console.log('🎉 SUCCESS! Database updated correctly.\n');
    console.log('📝 Next steps:');
    console.log('   1. Open browser console (F12)');
    console.log('   2. Run: localStorage.clear(); location.reload();');
    console.log('   3. Should now show 310 XP!\n');
  } else {
    console.log('⚠️ Update may not have persisted. Check RLS policies.');
  }
}

fixXP().catch(err => {
  console.error('\n❌ Error:', err.message);
});
