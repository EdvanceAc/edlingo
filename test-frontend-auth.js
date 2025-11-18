#!/usr/bin/env node

/**
 * Test Frontend Authentication Issues
 * 
 * This script tests the frontend authentication flow to identify
 * why the browser is getting ERR_ABORTED errors
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

async function testFrontendAuth() {
  log('Testing Frontend Authentication Issues', 'header');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    log('Missing Supabase credentials', 'error');
    return false;
  }
  
  log(`Testing with URL: ${supabaseUrl}`, 'info');
  log(`Using anon key: ${supabaseAnonKey.substring(0, 20)}...`, 'info');
  
  // Create client with anon key (same as frontend)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  log('\n--- Testing Unauthenticated Access ---', 'header');
  
  const tables = ['user_profiles', 'user_vocabulary', 'user_achievements', 'grammar_lessons'];
  const unauthResults = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        log(`❌ ${table}: ${error.message}`, 'error');
        unauthResults[table] = { accessible: false, error: error.message };
      } else {
        log(`✅ ${table}: Accessible (${data?.length || 0} rows)`, 'success');
        unauthResults[table] = { accessible: true, count: data?.length || 0 };
      }
    } catch (err) {
      log(`❌ ${table}: ${err.message}`, 'error');
      unauthResults[table] = { accessible: false, error: err.message };
    }
  }
  
  log('\n--- Testing Authenticated Access ---', 'header');
  
  // Try to sign in with a test user (if exists)
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@edlingo.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      log(`Authentication failed: ${authError.message}`, 'warning');
      log('This is expected if no test user exists', 'info');
    } else {
      log('✅ Authentication successful', 'success');
      
      // Test access with authenticated user
      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          
          if (error) {
            log(`❌ ${table} (auth): ${error.message}`, 'error');
          } else {
            log(`✅ ${table} (auth): Accessible (${data?.length || 0} rows)`, 'success');
          }
        } catch (err) {
          log(`❌ ${table} (auth): ${err.message}`, 'error');
        }
      }
    }
  } catch (err) {
    log(`Authentication test failed: ${err.message}`, 'warning');
  }
  
  log('\n--- Analysis ---', 'header');
  
  const inaccessibleTables = Object.entries(unauthResults)
    .filter(([table, result]) => !result.accessible)
    .map(([table]) => table);
  
  if (inaccessibleTables.length > 0) {
    log(`🔍 Root Cause Identified:`, 'warning');
    log(`The following tables are inaccessible to unauthenticated users:`, 'info');
    inaccessibleTables.forEach(table => {
      log(`   - ${table}: ${unauthResults[table].error}`, 'error');
    });
    
    log('\n💡 Solution:', 'header');
    log('The RLS policies require authenticated users, but the frontend is not authenticated.', 'info');
    log('This causes ERR_ABORTED errors in the browser.', 'warning');
    
    log('\n🔧 Fix Options:', 'header');
    log('1. Implement proper user authentication in the frontend', 'info');
    log('2. Create more permissive RLS policies for public access', 'info');
    log('3. Add authentication bypass for development', 'info');
    
    return false;
  } else {
    log('✅ All tables are accessible to unauthenticated users', 'success');
    log('The ERR_ABORTED errors may be caused by other issues', 'info');
    return true;
  }
}

// Execute the test
testFrontendAuth()
  .then(success => {
    if (success) {
      log('\n✅ Frontend authentication test completed - no issues found', 'success');
      process.exit(0);
    } else {
      log('\n⚠️ Frontend authentication issues identified', 'warning');
      log('Please implement the suggested fixes above', 'info');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n💥 Test execution error: ${error.message}`, 'error');
    process.exit(1);
  });