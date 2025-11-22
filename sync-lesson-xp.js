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

// Calculate XP based on completed lessons
async function syncLessonXP() {
  console.log('🔄 Syncing lesson XP for completed lessons...\n');

  // Get current user (you can replace with specific user email)
  const userEmail = 'arkasoftware1@gmail.com';

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === userEmail);

  if (!user) {
    console.error('❌ User not found:', userEmail);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (${user.id})\n`);

  // XP rewards per lesson
  const XP_PER_LESSON = 75; // From your CourseDetailsPage mockLessons

  // Count completed lessons from mock data
  // In your case: 3 lessons completed = 3 × 75 = 225 XP
  const completedLessonsCount = 3;
  const totalLessonXP = completedLessonsCount * XP_PER_LESSON;

  console.log(`📚 Completed lessons: ${completedLessonsCount}`);
  console.log(`⭐ Lesson XP earned: ${totalLessonXP} XP\n`);

  // Get current user progress
  const { data: currentProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!currentProgress) {
    console.log('📝 Creating new user_progress record...');
    
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: user.id,
        total_xp: totalLessonXP,
        current_level: Math.floor(Math.sqrt(totalLessonXP / 100)) + 1,
        lessons_completed: completedLessonsCount,
        current_streak: 7,
        daily_progress: 0,
        daily_goal: 1800,
        pronunciation_accuracy: 85
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating progress:', error.message);
    } else {
      console.log('✅ Created progress with lesson XP!\n');
      console.log(`   Total XP: ${data.total_xp}`);
      console.log(`   Level: ${data.current_level}`);
      console.log(`   Lessons: ${data.lessons_completed}`);
    }
  } else {
    console.log('📝 Updating existing user_progress...');
    console.log(`   Current XP: ${currentProgress.total_xp}`);
    console.log(`   Adding lesson XP: +${totalLessonXP}\n`);

    const newTotalXP = currentProgress.total_xp + totalLessonXP;
    const newLevel = Math.floor(Math.sqrt(newTotalXP / 100)) + 1;

    const { data, error } = await supabase
      .from('user_progress')
      .update({
        total_xp: newTotalXP,
        current_level: newLevel,
        lessons_completed: completedLessonsCount
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating progress:', error.message);
    } else {
      console.log('✅ Updated progress with lesson XP!\n');
      console.log(`   New Total XP: ${data.total_xp}`);
      console.log(`   New Level: ${data.current_level}`);
      console.log(`   Lessons: ${data.lessons_completed}`);
    }
  }

  console.log('\n🎉 Lesson XP sync complete!');
  console.log('💡 Hard refresh your browser (Ctrl+Shift+R) to see updated XP in header.');
}

syncLessonXP().catch(err => {
  console.error('\n❌ Error:', err.message);
});
