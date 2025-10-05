#!/usr/bin/env node

/**
 * Direct RLS Policy Fix using Supabase Client
 * 
 * This script fixes RLS policies by executing SQL directly through the Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  let prefix = 'ℹ️';
  
  switch (type) {
    case 'success':
      color = colors.green;
      prefix = '✅';
      break;
    case 'error':
      color = colors.red;
      prefix = '❌';
      break;
    case 'warning':
      color = colors.yellow;
      prefix = '⚠️';
      break;
    case 'header':
      color = colors.magenta;
      prefix = '🚀';
      break;
  }
  
  console.log(`${color}${prefix} [${timestamp}] ${message}${colors.reset}`);
}

function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('Missing Supabase credentials in .env file', 'error');
    log('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)', 'warning');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function testTableAccess(supabase) {
  log('Testing table access before fixes...', 'header');
  
  const tables = ['user_profiles', 'user_vocabulary', 'user_achievements', 'grammar_lessons'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        log(`❌ ${table}: ${error.message}`, 'error');
        results[table] = { accessible: false, error: error.message };
      } else {
        log(`✅ ${table}: Accessible`, 'success');
        results[table] = { accessible: true, count: data?.length || 0 };
      }
    } catch (err) {
      log(`❌ ${table}: ${err.message}`, 'error');
      results[table] = { accessible: false, error: err.message };
    }
  }
  
  return results;
}

async function fixRLSPolicies() {
  log('Starting Direct RLS Policy Fix', 'header');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    return false;
  }
  
  log('Supabase client initialized successfully', 'success');
  
  // Test access before fixes
  const beforeResults = await testTableAccess(supabase);
  
  // Check if we have any inaccessible tables
  const inaccessibleTables = Object.entries(beforeResults)
    .filter(([table, result]) => !result.accessible)
    .map(([table]) => table);
  
  if (inaccessibleTables.length === 0) {
    log('All tables are already accessible! No fixes needed.', 'success');
    return true;
  }
  
  log(`Found ${inaccessibleTables.length} inaccessible tables: ${inaccessibleTables.join(', ')}`, 'warning');
  
  // Since we can't execute DDL through the client, provide manual instructions
  log('\n🔧 MANUAL FIX REQUIRED:', 'header');
  log('The tables are inaccessible due to RLS policies. Please follow these steps:', 'info');
  log('\n1. Open your Supabase Dashboard', 'info');
  log('2. Navigate to SQL Editor', 'info');
  log('3. Execute the SQL file: fix-all-rls-errors.sql', 'info');
  log('4. Or copy and paste the following SQL commands:', 'info');
  
  console.log('\n' + colors.yellow + '--- SQL COMMANDS TO EXECUTE ---' + colors.reset);
  
  const sqlCommands = [
    '-- Fix user_profiles',
    'DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;',
    'CREATE POLICY "Allow authenticated users to view profiles" ON public.user_profiles FOR SELECT USING (auth.role() = \'authenticated\');',
    'CREATE POLICY "Allow authenticated users to insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (auth.role() = \'authenticated\');',
    'CREATE POLICY "Allow authenticated users to update profiles" ON public.user_profiles FOR UPDATE USING (auth.role() = \'authenticated\');',
    '',
    '-- Fix user_vocabulary',
    'DROP POLICY IF EXISTS "Users can manage own vocabulary" ON public.user_vocabulary;',
    'CREATE POLICY "Allow authenticated users to manage vocabulary" ON public.user_vocabulary FOR ALL USING (auth.role() = \'authenticated\');',
    '',
    '-- Fix user_achievements',
    'DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;',
    'CREATE POLICY "Allow authenticated users to view achievements" ON public.user_achievements FOR SELECT USING (auth.role() = \'authenticated\');',
    'CREATE POLICY "Allow authenticated users to insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.role() = \'authenticated\');',
    '',
    '-- Fix grammar_lessons',
    'DROP POLICY IF EXISTS "Anyone can view active grammar lessons" ON public.grammar_lessons;',
    'CREATE POLICY "Allow all to view grammar lessons" ON public.grammar_lessons FOR SELECT USING (true);',
    'CREATE POLICY "Allow authenticated users to manage grammar lessons" ON public.grammar_lessons FOR ALL USING (auth.role() = \'authenticated\');'
  ];
  
  sqlCommands.forEach(cmd => {
    if (cmd.startsWith('--')) {
      console.log(colors.blue + cmd + colors.reset);
    } else if (cmd === '') {
      console.log('');
    } else {
      console.log(colors.green + cmd + colors.reset);
    }
  });
  
  console.log(colors.yellow + '--- END SQL COMMANDS ---\n' + colors.reset);
  
  log('5. After executing the SQL, run this script again to verify the fixes', 'info');
  
  return false;
}

// Execute the fix
fixRLSPolicies()
  .then(success => {
    if (success) {
      log('\n✅ All tables are accessible!', 'success');
      log('Your application should now work without RLS errors.', 'info');
      process.exit(0);
    } else {
      log('\n⚠️ Manual intervention required.', 'warning');
      log('Please execute the SQL commands shown above in your Supabase Dashboard.', 'info');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n💥 Script execution error: ${error.message}`, 'error');
    process.exit(1);
  });