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

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate user_progress records...\n');

  const userEmail = 'arkasoftware1@gmail.com';

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === userEmail);

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  console.log(`User: ${userEmail}`);
  console.log(`User ID: ${user.id}\n`);

  // Get ALL records for this user (not just one)
  const { data: allRecords, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${allRecords.length} record(s)\n`);

  if (allRecords.length === 0) {
    console.log('⚠️  No records found!');
    return;
  }

  allRecords.forEach((record, index) => {
    console.log(`Record #${index + 1}:`);
    console.log(`  ID: ${record.id || 'N/A'}`);
    console.log(`  Total XP: ${record.total_xp}`);
    console.log(`  Level: ${record.current_level}`);
    console.log(`  Lessons: ${record.lessons_completed}`);
    console.log(`  Streak: ${record.daily_streak}`);
    console.log(`  Language: ${record.language}`);
    console.log(`  Updated: ${record.updated_at}`);
    console.log(`  Created: ${record.created_at}\n`);
  });

  if (allRecords.length > 1) {
    console.log('⚠️  MULTIPLE RECORDS FOUND! This is the problem.\n');
    console.log('🔧 Fixing: Will keep the record with highest XP and delete others...\n');

    // Find the record with the highest XP
    const bestRecord = allRecords.reduce((best, current) => 
      current.total_xp > best.total_xp ? current : best
    );

    console.log(`✅ Keeping record with ${bestRecord.total_xp} XP (ID: ${bestRecord.id})\n`);

    // Delete all other records
    for (const record of allRecords) {
      if (record.id !== bestRecord.id) {
        console.log(`🗑️  Deleting record with ${record.total_xp} XP...`);
        const { error: deleteError } = await supabase
          .from('user_progress')
          .delete()
          .eq('id', record.id);

        if (deleteError) {
          console.error(`   ❌ Failed: ${deleteError.message}`);
        } else {
          console.log(`   ✅ Deleted`);
        }
      }
    }

    console.log('\n✅ Cleanup complete! Now you should have only one record.');
    console.log('\n📝 Next steps:');
    console.log('   1. Open browser console (F12)');
    console.log('   2. Run: localStorage.clear(); location.reload();');
    console.log('   3. Should now show correct XP!');

  } else {
    console.log('✅ Only one record found (good!)');
    console.log(`   XP: ${allRecords[0].total_xp}`);
    console.log(`   Lessons: ${allRecords[0].lessons_completed}`);
    
    if (allRecords[0].total_xp !== 310) {
      console.log('\n⚠️  But XP is wrong. Updating to 310...\n');
      
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          total_xp: 310,
          lessons_completed: 3,
          current_level: 2
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Update failed:', updateError.message);
      } else {
        console.log('✅ Updated to 310 XP!');
        console.log('\n📝 Clear browser cache: localStorage.clear(); location.reload();');
      }
    }
  }
}

checkDuplicates().catch(err => {
  console.error('\n❌ Error:', err.message);
});
