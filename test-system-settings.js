const fs = require('fs');
const path = require('path');

// Simple SQL syntax validation for system_settings migration
function validateSystemSettingsSQL() {
  console.log('🔍 Validating system_settings.sql syntax...');
  
  const sqlPath = path.join(__dirname, 'database', 'migrations', 'create_system_settings.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ create_system_settings.sql file not found');
    return false;
  }
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Basic syntax checks
  const checks = [
    {
      name: 'No reference to non-existent users table',
      test: !sqlContent.includes('FROM users'),
      message: 'Should use public.is_admin() function instead of users table'
    },
    {
      name: 'Uses proper admin function',
      test: sqlContent.includes('public.is_admin()'),
      message: 'Should reference the existing is_admin() function'
    },
    {
      name: 'Has service role bypass',
      test: sqlContent.includes('service_role'),
      message: 'Should include service role bypass policy'
    },
    {
      name: 'Has RLS enabled',
      test: sqlContent.includes('ENABLE ROW LEVEL SECURITY'),
      message: 'Should enable Row Level Security'
    },
    {
      name: 'Has proper table creation',
      test: sqlContent.includes('CREATE TABLE IF NOT EXISTS system_settings'),
      message: 'Should create system_settings table'
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}: ${check.message}`);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('\n🎉 All syntax checks passed!');
    console.log('\n📋 Manual execution instructions:');
    console.log('1. Copy the SQL content from create_system_settings.sql');
    console.log('2. Go to Supabase Dashboard > SQL Editor');
    console.log('3. Paste and execute the SQL');
    console.log('4. Verify the system_settings table is created');
  } else {
    console.log('\n❌ Some checks failed. Please review the SQL file.');
  }
  
  return allPassed;
}

// Run validation
validateSystemSettingsSQL();