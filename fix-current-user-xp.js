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

async function fixUserXP() {
  console.log('🔧 Fixing XP for current user...\n');

  const userEmail = 'bennyb7878@gmail.com';

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === userEmail);

  if (!user) {
    console.error('❌ User not found:', userEmail);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email}`);
  console.log(`   User ID: ${user.id}\n`);

  // Get current progress
  const { data: currentProgress, error: fetchError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('❌ Error fetching progress:', fetchError.message);
    process.exit(1);
  }

  if (!currentProgress) {
    console.log('⚠️  No progress record found. Creating one...\n');
    
    // Create initial progress with lesson XP
    const { error: createError } = await supabase
      .from('user_progress')
      .insert({
        user_id: user.id,
        total_xp: 310,
        current_level: 2,
        lessons_completed: 3,
        daily_streak: 7,
        daily_progress: 0,
        daily_goal: 1800,
        pronunciation_accuracy: 85,
        language: 'en'
      });

    if (createError) {
      console.error('❌ Create failed:', createError.message);
      process.exit(1);
    }

    console.log('✅ Created progress record with 310 XP!\n');
  } else {
    console.log('📊 Current Progress:');
    console.log(`   Total XP: ${currentProgress.total_xp}`);
    console.log(`   Level: ${currentProgress.current_level}`);
    console.log(`   Lessons: ${currentProgress.lessons_completed}`);
    console.log(`   Streak: ${currentProgress.daily_streak}\n`);

    // Check if we need to add lesson XP
    const lessonXP = 225; // 3 lessons × 75 XP
    const correctTotalXP = 310;
    
    if (currentProgress.total_xp < correctTotalXP) {
      console.log(`🔧 Updating XP from ${currentProgress.total_xp} to ${correctTotalXP}...\n`);
      
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          total_xp: correctTotalXP,
          current_level: 2,
          lessons_completed: 3
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Update failed:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Updated to 310 XP!\n');
    } else {
      console.log('✅ XP is already correct!\n');
    }
  }

  // Verify final state
  const { data: finalProgress } = await supabase
    .from('user_progress')
    .select('total_xp, current_level, lessons_completed')
    .eq('user_id', user.id)
    .single();

  console.log('✅ FINAL STATE:');
  console.log('─'.repeat(50));
  console.log(`   User: ${userEmail}`);
  console.log(`   Total XP: ${finalProgress.total_xp}`);
  console.log(`   Level: ${finalProgress.current_level}`);
  console.log(`   Lessons: ${finalProgress.lessons_completed}`);
  console.log('─'.repeat(50));

  console.log('\n🎉 Database updated successfully!');
  console.log('\n📝 Now in your browser:');
  console.log('   1. Open Console (F12)');
  console.log('   2. Type: localStorage.clear()');
  console.log('   3. Press Enter');
  console.log('   4. Type: location.reload(true)');
  console.log('   5. Press Enter');
  console.log('\n   Should now show 310 XP! ✨');
}

fixUserXP().catch(err => {
  console.error('\n❌ Error:', err.message);
});
