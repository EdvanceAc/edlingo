#!/usr/bin/env node

/**
 * Comprehensive RLS Policy Fix for EdLingo Database
 * 
 * This script fixes RLS policies for all tables causing access errors:
 * - user_vocabulary
 * - user_achievements 
 * - user_profiles
 * - grammar_lessons
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
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('Missing Supabase credentials in .env file', 'error');
    log('Required: SUPABASE_URL and SUPABASE_ANON_KEY', 'warning');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function executeSQL(supabase, sql, description) {
  try {
    log(`Executing: ${description}`, 'info');
    log(`SQL: ${sql.substring(0, 100)}...`, 'blue');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      log(`Error in ${description}: ${error.message}`, 'error');
      return { success: false, error };
    }
    
    log(`Success: ${description}`, 'success');
    return { success: true, data };
  } catch (error) {
    log(`Exception in ${description}: ${error.message}`, 'error');
    return { success: false, error };
  }
}

async function fixAllRLSPolicies() {
  log('Starting Comprehensive RLS Policy Fix', 'header');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    return false;
  }
  
  log('Supabase client initialized successfully', 'success');
  
  const fixes = [
    {
      table: 'user_profiles',
      description: 'Fix user_profiles RLS policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
        
        -- Create permissive policies
        CREATE POLICY "Allow authenticated users to view profiles" ON public.user_profiles
            FOR SELECT USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Allow authenticated users to insert profiles" ON public.user_profiles
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Allow authenticated users to update profiles" ON public.user_profiles
            FOR UPDATE USING (auth.role() = 'authenticated');
      `
    },
    {
      table: 'user_vocabulary',
      description: 'Fix user_vocabulary RLS policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can manage own vocabulary" ON public.user_vocabulary;
        
        -- Create permissive policies
        CREATE POLICY "Allow authenticated users to manage vocabulary" ON public.user_vocabulary
            FOR ALL USING (auth.role() = 'authenticated');
      `
    },
    {
      table: 'user_achievements',
      description: 'Fix user_achievements RLS policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
        DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
        
        -- Create permissive policies
        CREATE POLICY "Allow authenticated users to view achievements" ON public.user_achievements
            FOR SELECT USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Allow authenticated users to insert achievements" ON public.user_achievements
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      `
    },
    {
      table: 'grammar_lessons',
      description: 'Fix grammar_lessons RLS policies',
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view active grammar lessons" ON public.grammar_lessons;
        DROP POLICY IF EXISTS "Authenticated users can manage grammar lessons" ON public.grammar_lessons;
        
        -- Create permissive policies
        CREATE POLICY "Allow all to view grammar lessons" ON public.grammar_lessons
            FOR SELECT USING (true);
        
        CREATE POLICY "Allow authenticated users to manage grammar lessons" ON public.grammar_lessons
            FOR ALL USING (auth.role() = 'authenticated');
      `
    }
  ];
  
  let allSuccess = true;
  
  for (const fix of fixes) {
    log(`\n--- Fixing ${fix.table} ---`, 'header');
    
    const result = await executeSQL(supabase, fix.sql, fix.description);
    if (!result.success) {
      log(`Failed to fix ${fix.table}`, 'error');
      allSuccess = false;
    } else {
      log(`Successfully fixed ${fix.table}`, 'success');
    }
  }
  
  return allSuccess;
}

// Execute the fix
fixAllRLSPolicies()
  .then(success => {
    if (success) {
      log('\n✅ All RLS Policy fixes completed successfully!', 'success');
      log('Your application should now be able to access all tables without RLS errors.', 'info');
      process.exit(0);
    } else {
      log('\n❌ Some RLS Policy fixes failed. Manual intervention may be required.', 'error');
      log('Check the logs above for specific errors.', 'warning');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n💥 Script execution error: ${error.message}`, 'error');
    log('\n🔧 Manual Fix Instructions:', 'header');
    log('1. Open your Supabase Dashboard', 'info');
    log('2. Go to SQL Editor', 'info');
    log('3. Execute the SQL commands for each table manually', 'info');
    process.exit(1);
  });