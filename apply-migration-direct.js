import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('Please add these to your .env file:');
  console.log('- VITE_SUPABASE_URL or SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndAddColumns() {
  console.log('🔍 Checking user_progress table structure...\n');

  // Check current user_progress records
  const { data: users, error: usersError } = await supabase
    .from('user_progress')
    .select('*')
    .limit(1);

  if (usersError) {
    console.error('❌ Error accessing user_progress table:', usersError.message);
    console.log('\n💡 You need to apply the migration manually:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy SQL from: database/migrations/060_add_daily_goal_and_progress.sql');
    console.log('3. Run it in the SQL Editor');
    return;
  }

  if (users && users.length > 0) {
    const user = users[0];
    console.log('📊 Current user_progress columns:', Object.keys(user).join(', '));
    console.log('');

    const missingColumns = [];
    if (!('daily_goal' in user)) missingColumns.push('daily_goal');
    if (!('daily_progress' in user)) missingColumns.push('daily_progress');
    if (!('pronunciation_accuracy' in user)) missingColumns.push('pronunciation_accuracy');
    if (!('lessons_completed' in user)) missingColumns.push('lessons_completed');

    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns.join(', '));
      console.log('');
      console.log('📝 To fix this, run this SQL in Supabase Dashboard → SQL Editor:');
      console.log('─'.repeat(70));
      console.log(`
-- Add missing columns
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 30;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS daily_progress INTEGER DEFAULT 0;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_daily_goal ON public.user_progress(daily_goal);
CREATE INDEX IF NOT EXISTS idx_user_progress_daily_progress ON public.user_progress(daily_progress);
      `.trim());
      console.log('─'.repeat(70));
      console.log('\n✅ After running the SQL, restart your dev server.');
    } else {
      console.log('✅ All required columns exist!');
      console.log('🎮 Your Dashboard should now show dynamic data.');
    }
  } else {
    console.log('ℹ️  No user_progress records found yet.');
    console.log('The columns will be created automatically when a user creates their first progress record.');
  }
}

checkAndAddColumns();
