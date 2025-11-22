import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Create client with ANON key (like the app uses)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthProgress() {
  console.log('🔐 Testing authenticated progress fetch...\n');

  // Try to sign in
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'arkasoftware1@gmail.com',
    password: process.argv[2] || 'test-password' // Pass password as argument
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    console.log('\n💡 Usage: node test-auth-progress.js YOUR_PASSWORD');
    console.log('   Replace YOUR_PASSWORD with arkasoftware1@gmail.com\'s password');
    return;
  }

  const user = authData.user;
  console.log(`✅ Signed in as: ${user.email}`);
  console.log(`   User ID: ${user.id}\n`);

  // Now try to fetch progress (like ProgressProvider does)
  console.log('📊 Fetching progress data...\n');

  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('user_id,total_xp,current_level,daily_streak,daily_goal,daily_progress,last_study_date,lessons_completed,pronunciation_accuracy,chat_messages,achievements,language')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (progressError) {
    console.error('❌ Error fetching progress:', progressError.message);
    console.error('   Code:', progressError.code);
    console.error('   Details:', progressError.details);
    console.log('\n🔒 This is likely an RLS (Row Level Security) policy issue!');
    console.log('📝 Follow instructions in: RLS_FIX_INSTRUCTIONS.md');
    return;
  }

  if (!progress || progress.length === 0) {
    console.log('⚠️  No progress data found for this user');
    console.log('   Creating initial progress record...\n');

    const initialProgress = {
      user_id: user.id,
      language: 'en',
      current_level: '1',
      total_xp: 85,
      daily_streak: 7,
      daily_goal: 30,
      daily_progress: 15,
      lessons_completed: 3,
      pronunciation_accuracy: 85.5,
      achievements: ['first_lesson', 'streak_3', 'streak_7'],
      chat_messages: 25
    };

    const { error: insertError } = await supabase
      .from('user_progress')
      .upsert(initialProgress, { onConflict: 'user_id,language' });

    if (insertError) {
      console.error('❌ Error creating progress:', insertError.message);
      return;
    }

    console.log('✅ Initial progress created!');
    return;
  }

  console.log('✅ Progress data fetched successfully!\n');
  const p = progress[0];
  console.log('📊 Your Progress:');
  console.log(`   Level: ${p.current_level}`);
  console.log(`   XP: ${p.total_xp}`);
  console.log(`   Streak: ${p.daily_streak} days`);
  console.log(`   Daily Goal: ${p.daily_goal} minutes`);
  console.log(`   Daily Progress: ${p.daily_progress} minutes`);
  console.log(`   Lessons: ${p.lessons_completed}`);
  console.log(`   Pronunciation: ${p.pronunciation_accuracy}%`);
  console.log('\n✅ The ProgressProvider should work correctly!');
  console.log('💡 Hard refresh your browser to see this data on Dashboard');

  // Sign out
  await supabase.auth.signOut();
}

testAuthProgress();
