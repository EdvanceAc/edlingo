import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserProgress() {
  console.log('🔍 Checking user_progress data...\n');

  const { data: progressData, error } = await supabase
    .from('user_progress')
    .select('user_id, total_xp, current_level, daily_streak, daily_goal, daily_progress, lessons_completed, pronunciation_accuracy')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching data:', error.message);
    return;
  }

  if (!progressData || progressData.length === 0) {
    console.log('⚠️  No user progress data found in the database.');
    console.log('');
    console.log('This is why you see default values!');
    console.log('');
    console.log('To populate data:');
    console.log('1. Log into your app');
    console.log('2. Complete a lesson or activity');
    console.log('3. The progress will be automatically saved');
    return;
  }

  console.log(`✅ Found ${progressData.length} user progress record(s):\n`);
  
  progressData.forEach((user, index) => {
    console.log(`👤 User ${index + 1}:`);
    console.log(`   Level: ${user.current_level || 'Not set'}`);
    console.log(`   Total XP: ${user.total_xp || 0}`);
    console.log(`   Streak: ${user.daily_streak || 0} days`);
    console.log(`   Daily Goal: ${user.daily_goal || 30} minutes`);
    console.log(`   Daily Progress: ${user.daily_progress || 0} minutes`);
    console.log(`   Lessons Completed: ${user.lessons_completed || 0}`);
    console.log(`   Pronunciation: ${user.pronunciation_accuracy || 0}%`);
    console.log('');
  });

  console.log('🎮 Dashboard should display this data!');
  console.log('💡 If you still see wrong values, try:');
  console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
  console.log('   2. Check browser console for errors');
  console.log('   3. Verify you\'re logged in');
}

checkUserProgress();
