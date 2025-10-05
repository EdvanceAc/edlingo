#!/usr/bin/env node

/**
 * Fix RLS Policies for user_progress table
 * 
 * This script disables Row Level Security on the user_progress table
 * to resolve the "new row violates row-level security policy" error.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('Supabase credentials not found in environment variables', 'error');
    log('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file', 'warning');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Execute SQL using Supabase RPC
async function executeSQL(supabase, sql, description) {
  try {
    log(`Executing: ${description}`, 'info');
    
    // Use the rpc function to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct query approach
      if (error.code === 'PGRST202') {
        log('RPC function not available, trying alternative approach...', 'warning');
        
        // For simple operations, we can use the REST API directly
        if (sql.includes('DISABLE ROW LEVEL SECURITY')) {
          log('Cannot disable RLS via REST API. Manual intervention required.', 'error');
          return { success: false, error: 'RLS operations require direct database access' };
        }
      }
      
      log(`SQL execution failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
    
    log(`✅ ${description} completed successfully`, 'success');
    return { success: true, data };
    
  } catch (error) {
    log(`SQL execution error: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

// Main function to fix RLS policies
async function fixRLSPolicies() {
  log('Starting RLS Policy Fix for user_progress table', 'header');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    return false;
  }
  
  log('Supabase client initialized successfully', 'success');
  
  try {
    // Read the RLS fix SQL file
    const sqlContent = fs.readFileSync('./fix-user-progress-rls.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') &&
        !stmt.includes('Uncomment') &&
        !stmt.includes('Option 2') &&
        !stmt.includes('Option 3')
      );
    
    log(`Found ${statements.length} SQL statements to execute`, 'info');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('ALTER TABLE') && statement.includes('DISABLE ROW LEVEL SECURITY')) {
        const result = await executeSQL(supabase, statement, `Disable RLS on user_progress table`);
        if (!result.success) {
          log('Failed to disable RLS. You need to execute this manually in Supabase Dashboard:', 'error');
          log('ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;', 'warning');
          return false;
        }
      } else if (statement.includes('SELECT')) {
        // Execute verification queries
        const result = await executeSQL(supabase, statement, `Verification query ${i + 1}`);
        if (result.success && result.data) {
          log(`Query result: ${JSON.stringify(result.data)}`, 'info');
        }
      }
    }
    
    log('RLS Policy fix completed successfully!', 'success');
    log('The user_progress table should now allow all operations without RLS restrictions.', 'info');
    
    return true;
    
  } catch (error) {
    log(`RLS fix failed: ${error.message}`, 'error');
    
    // Provide manual instructions
    log('\n🔧 Manual Fix Instructions:', 'header');
    log('1. Open your Supabase Dashboard', 'info');
    log('2. Go to SQL Editor', 'info');
    log('3. Execute this SQL command:', 'info');
    log('   ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;', 'warning');
    log('4. Click "Run" to execute', 'info');
    
    return false;
  }
}

// Execute the fix
fixRLSPolicies()
  .then(success => {
    if (success) {
      log('\n✅ RLS Policy fix completed successfully!', 'success');
      log('Your application should now be able to access user_progress without RLS errors.', 'info');
      process.exit(0);
    } else {
      log('\n❌ RLS Policy fix failed. Manual intervention required.', 'error');
      log('Please follow the manual instructions above.', 'warning');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n💥 Script execution error: ${error.message}`, 'error');
    log('\n🔧 Troubleshooting:', 'header');
    log('   1. Check your .env file has correct Supabase credentials', 'info');
    log('   2. Verify SUPABASE_URL and SUPABASE_ANON_KEY are valid', 'info');
    log('   3. Try the manual fix in Supabase Dashboard', 'info');
    log('   4. Execute: ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;', 'warning');
    process.exit(1);
  });