import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyProgress() {
  console.log('🔍 Verifying user_progress data (using admin access)...\n');

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No data found - something went wrong!');
    return;
  }

  console.log(`✅ Found ${data.length} progress record(s)!\n`);
  
  data.forEach((record, index) => {
    console.log(`📊 Record ${index + 1}:`);
    console.log(`   User ID: ${record.user_id}`);
    console.log(`   Level: ${record.current_level}`);
    console.log(`   XP: ${record.total_xp}`);
    console.log(`   Streak: ${record.daily_streak} days`);
    console.log(`   Daily Goal: ${record.daily_goal} min`);
    console.log(`   Daily Progress: ${record.daily_progress} min`);
    console.log(`   Lessons: ${record.lessons_completed}`);
    console.log(`   Pronunciation: ${record.pronunciation_accuracy}%`);
    console.log('');
  });

  console.log('✅ Data exists in database!');
  console.log('\n🎮 Next steps:');
  console.log('   1. Hard refresh your browser (Ctrl+Shift+R)');
  console.log('   2. Make sure you\'re logged in as: arkasoftware1@gmail.com');
  console.log('   3. The Dashboard will fetch this data automatically!');
}

verifyProgress();
