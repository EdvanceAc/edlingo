import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedUserProgress() {
  console.log('🌱 Creating sample user progress data...\n');

  // Get the first user from auth.users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError || !users || users.length === 0) {
    console.error('❌ No users found. Please sign up first!');
    return;
  }

  const user = users[0];
  console.log(`👤 Found user: ${user.email}`);

  // Check if user_profiles exists for this user
  let profileId = user.id;
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (profiles && profiles.length > 0) {
    profileId = profiles[0].id;
  }

  // Create sample progress data
  const sampleProgress = {
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
    chat_messages: 25,
    cefr_level: 'A1'
  };

  console.log('\n📊 Sample progress data:');
  console.log('   Level: 1');
  console.log('   Total XP: 85');
  console.log('   Streak: 7 days');
  console.log('   Daily Goal: 30 minutes');
  console.log('   Daily Progress: 15 minutes');
  console.log('   Lessons Completed: 3');
  console.log('   Pronunciation: 85.5%');
  console.log('');

  const { data, error } = await supabase
    .from('user_progress')
    .upsert(sampleProgress, {
      onConflict: 'user_id,language'
    })
    .select();

  if (error) {
    console.error('❌ Error creating progress:', error.message);
    console.log('\nTrying alternative approach...');
    
    // Try insert instead
    const { data: insertData, error: insertError } = await supabase
      .from('user_progress')
      .insert(sampleProgress)
      .select();
    
    if (insertError) {
      console.error('❌ Insert also failed:', insertError.message);
      return;
    }
    
    console.log('✅ Sample progress data created successfully!');
  } else {
    console.log('✅ Sample progress data created successfully!');
  }

  console.log('\n🎮 Now refresh your Dashboard page to see:');
  console.log('   ✨ Level 1 with 85 XP');
  console.log('   🔥 7 day streak');
  console.log('   🎯 15/30 minutes daily goal');
  console.log('   📚 3 lessons completed');
  console.log('\n💡 Hard refresh your browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)');
}

seedUserProgress();
