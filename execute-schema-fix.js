#!/usr/bin/env node

/**
 * Execute Complete Schema Fix Script
 * 
 * This script executes the complete-schema-fix.sql to add all missing columns
 * that were identified in the database verification.
 * 
 * Usage: node execute-schema-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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
  const timestamp = new Date().toLocaleTimeString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    header: colors.magenta
  };
  
  console.log(`${colorMap[type]}[${timestamp}] ${message}${colors.reset}`);
}

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ Supabase credentials not found in environment variables', 'error');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Execute SQL statements one by one
async function executeSQLStatements(supabase, sqlStatements) {
  const results = [];
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i].trim();
    
    // Skip empty statements and comments
    if (!sql || sql.startsWith('--') || sql.startsWith('/*')) {
      continue;
    }
    
    log(`Executing statement ${i + 1}/${sqlStatements.length}...`, 'info');
    
    try {
      // Try using rpc first
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        // If rpc fails, try direct query for SELECT statements
        if (sql.toUpperCase().trim().startsWith('SELECT')) {
          log(`RPC failed, trying direct query: ${error.message}`, 'warning');
          
          // For verification queries, we can skip them if they fail
          results.push({ sql: sql.substring(0, 50) + '...', success: false, error: error.message, skipped: true });
          continue;
        } else {
          log(`❌ Failed to execute: ${sql.substring(0, 100)}...`, 'error');
          log(`Error: ${error.message}`, 'error');
          results.push({ sql: sql.substring(0, 50) + '...', success: false, error: error.message });
          continue;
        }
      }
      
      log(`✅ Success: ${sql.substring(0, 50)}...`, 'success');
      results.push({ sql: sql.substring(0, 50) + '...', success: true, data });
      
    } catch (error) {
      log(`❌ Exception: ${sql.substring(0, 100)}...`, 'error');
      log(`Error: ${error.message}`, 'error');
      results.push({ sql: sql.substring(0, 50) + '...', success: false, error: error.message });
    }
    
    // Small delay between statements
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Execute individual critical fixes
async function executeCriticalFixes(supabase) {
  log('🔧 Executing critical schema fixes...', 'header');
  
  const criticalFixes = [
    {
      name: 'Add lessons_completed to user_progress',
      sql: 'ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0;'
    },
    {
      name: 'Add difficulty_level to courses',
      sql: 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT \'beginner\';'
    },
    {
      name: 'Add course_id to lessons',
      sql: 'ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS course_id UUID;'
    },
    {
      name: 'Add content to lessons',
      sql: 'ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content TEXT;'
    },
    {
      name: 'Add order_index to lessons',
      sql: 'ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;'
    },
    {
      name: 'Update user_progress default values',
      sql: 'UPDATE public.user_progress SET lessons_completed = 0 WHERE lessons_completed IS NULL;'
    },
    {
      name: 'Update courses default difficulty',
      sql: 'UPDATE public.courses SET difficulty_level = \'beginner\' WHERE difficulty_level IS NULL;'
    }
  ];
  
  const results = [];
  
  for (const fix of criticalFixes) {
    log(`Applying: ${fix.name}`, 'info');
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: fix.sql });
      
      if (error) {
        log(`❌ ${fix.name}: ${error.message}`, 'error');
        results.push({ name: fix.name, success: false, error: error.message });
      } else {
        log(`✅ ${fix.name}: Applied successfully`, 'success');
        results.push({ name: fix.name, success: true });
      }
    } catch (error) {
      log(`❌ ${fix.name}: ${error.message}`, 'error');
      results.push({ name: fix.name, success: false, error: error.message });
    }
    
    // Small delay between fixes
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

// Test the fixes by running verification queries
async function testFixes(supabase) {
  log('🧪 Testing applied fixes...', 'header');
  
  const testQueries = [
    {
      name: 'Test user_progress with lessons_completed',
      query: supabase
        .from('user_progress')
        .select('id, user_id, lessons_completed, last_study_date, current_level')
        .limit(1)
    },
    {
      name: 'Test courses with difficulty_level',
      query: supabase
        .from('courses')
        .select('id, title, difficulty_level, is_active')
        .limit(1)
    },
    {
      name: 'Test lessons with new columns',
      query: supabase
        .from('lessons')
        .select('id, course_id, title, content, order_index')
        .limit(1)
    },
    {
      name: 'Test notifications table',
      query: supabase
        .from('notifications')
        .select('id, user_id, content, created_at, is_read, type')
        .limit(1)
    }
  ];
  
  const testResults = [];
  
  for (const test of testQueries) {
    try {
      const { data, error } = await test.query;
      
      if (error) {
        log(`❌ ${test.name}: ${error.message}`, 'error');
        testResults.push({ name: test.name, success: false, error: error.message });
      } else {
        log(`✅ ${test.name}: Query executed successfully`, 'success');
        testResults.push({ name: test.name, success: true, recordCount: data?.length || 0 });
      }
    } catch (error) {
      log(`❌ ${test.name}: ${error.message}`, 'error');
      testResults.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  return testResults;
}

// Main execution function
async function main() {
  console.log('🔧 EdLingo Complete Schema Fix Executor');
  console.log('======================================\n');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    process.exit(1);
  }
  
  log('✅ Supabase client initialized', 'success');
  
  try {
    // Execute critical fixes
    const fixResults = await executeCriticalFixes(supabase);
    
    // Test the fixes
    const testResults = await testFixes(supabase);
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      fixResults,
      testResults,
      summary: {
        totalFixes: fixResults.length,
        successfulFixes: fixResults.filter(r => r.success).length,
        failedFixes: fixResults.filter(r => !r.success).length,
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.success).length,
        failedTests: testResults.filter(r => !r.success).length
      }
    };
    
    // Display summary
    log('\n📊 Schema Fix Summary:', 'header');
    log(`Fixes Applied: ${report.summary.successfulFixes}/${report.summary.totalFixes}`, 
        report.summary.successfulFixes === report.summary.totalFixes ? 'success' : 'warning');
    log(`Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}`, 
        report.summary.passedTests === report.summary.totalTests ? 'success' : 'warning');
    
    const overallSuccess = report.summary.successfulFixes === report.summary.totalFixes && 
                          report.summary.passedTests === report.summary.totalTests;
    
    if (overallSuccess) {
      log('\n🎉 All schema fixes applied successfully!', 'success');
      log('Database is now ready for course management testing.', 'success');
      log('\n📝 Next steps:', 'info');
      log('1. Run: node simple-schema-verification.js', 'info');
      log('2. Execute TestSprite course management tests', 'info');
    } else {
      log('\n⚠️  Some fixes failed or tests are still failing', 'warning');
      log('Check the detailed report for specific issues.', 'warning');
      
      if (report.summary.failedFixes > 0) {
        log('\n❌ Failed fixes:', 'error');
        fixResults.filter(r => !r.success).forEach(fix => {
          log(`   - ${fix.name}: ${fix.error}`, 'error');
        });
      }
      
      if (report.summary.failedTests > 0) {
        log('\n❌ Failed tests:', 'error');
        testResults.filter(r => !r.success).forEach(test => {
          log(`   - ${test.name}: ${test.error}`, 'error');
        });
      }
    }
    
    // Save detailed report
    fs.writeFileSync('schema-fix-execution-report.json', JSON.stringify(report, null, 2));
    log('\n💾 Detailed report saved to schema-fix-execution-report.json', 'info');
    
  } catch (error) {
    log(`❌ Schema fix execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the schema fix
if (require.main === module) {
  main().catch(error => {
    log(`❌ Script execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, executeCriticalFixes, testFixes };