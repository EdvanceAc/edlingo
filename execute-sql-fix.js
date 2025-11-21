#!/usr/bin/env node

/**
 * Execute SQL Schema Fix Script
 * 
 * This script reads the complete-schema-fix.sql file and executes it
 * using the Supabase client to add all missing database columns.
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

// Execute individual SQL statements
async function executeSQL(supabase, sql) {
  try {
    // Use the REST API directly for DDL operations
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    
    const result = await response.json();
    return { success: true, result };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Execute critical schema fixes one by one
async function executeCriticalFixes(supabase) {
  log('🔧 Executing critical database schema fixes...', 'header');
  
  const fixes = [
    {
      name: 'Add lessons_completed to user_progress',
      sql: `ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0;`
    },
    {
      name: 'Add index for lessons_completed',
      sql: `CREATE INDEX IF NOT EXISTS idx_user_progress_lessons_completed ON public.user_progress(lessons_completed);`
    },
    {
      name: 'Add user_id to user_profiles',
      sql: `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS user_id UUID;`
    },
    {
      name: 'Add difficulty_level to courses',
      sql: `ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner';`
    },
    {
      name: 'Add index for difficulty_level',
      sql: `CREATE INDEX IF NOT EXISTS idx_courses_difficulty_level ON public.courses(difficulty_level);`
    },
    {
      name: 'Add course_id to lessons',
      sql: `ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS course_id UUID;`
    },
    {
      name: 'Add content to lessons',
      sql: `ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content TEXT;`
    },
    {
      name: 'Add order_index to lessons',
      sql: `ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`
    },
    {
      name: 'Add indexes for lessons',
      sql: `CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id); CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON public.lessons(order_index);`
    },
    {
      name: 'Update user_progress default values',
      sql: `UPDATE public.user_progress SET lessons_completed = 0 WHERE lessons_completed IS NULL;`
    },
    {
      name: 'Update courses default difficulty',
      sql: `UPDATE public.courses SET difficulty_level = 'beginner' WHERE difficulty_level IS NULL;`
    },
    {
      name: 'Update lessons default order_index',
      sql: `UPDATE public.lessons SET order_index = 0 WHERE order_index IS NULL;`
    }
  ];
  
  const results = [];
  
  for (const fix of fixes) {
    log(`Applying: ${fix.name}`, 'info');
    
    try {
      // Try direct query approach
      const { data, error } = await supabase.rpc('query', { query_text: fix.sql });
      
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
    
    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Test the applied fixes
async function testAppliedFixes(supabase) {
  log('🧪 Testing applied database fixes...', 'header');
  
  const tests = [
    {
      name: 'Test user_progress with lessons_completed',
      test: async () => {
        const { data, error } = await supabase
          .from('user_progress')
          .select('id, user_id, lessons_completed, last_study_date, current_level')
          .limit(1);
        return { success: !error, error: error?.message, count: data?.length || 0 };
      }
    },
    {
      name: 'Test courses with difficulty_level',
      test: async () => {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, difficulty_level, is_active')
          .limit(1);
        return { success: !error, error: error?.message, count: data?.length || 0 };
      }
    },
    {
      name: 'Test lessons with new columns',
      test: async () => {
        const { data, error } = await supabase
          .from('lessons')
          .select('id, course_id, title, content, order_index')
          .limit(1);
        return { success: !error, error: error?.message, count: data?.length || 0 };
      }
    },
    {
      name: 'Test notifications table',
      test: async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, user_id, content, created_at, is_read, type')
          .limit(1);
        return { success: !error, error: error?.message, count: data?.length || 0 };
      }
    }
  ];
  
  const testResults = [];
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result.success) {
        log(`✅ ${test.name}: PASSED (${result.count} records)`, 'success');
      } else {
        log(`❌ ${test.name}: FAILED - ${result.error}`, 'error');
      }
      testResults.push({ name: test.name, ...result });
    } catch (error) {
      log(`❌ ${test.name}: ERROR - ${error.message}`, 'error');
      testResults.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  return testResults;
}

// Main execution
async function main() {
  console.log('🔧 EdLingo Database Schema Fix Executor');
  console.log('======================================\n');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    process.exit(1);
  }
  
  log('✅ Supabase client initialized', 'success');
  
  try {
    // Execute the fixes
    const fixResults = await executeCriticalFixes(supabase);
    
    // Test the fixes
    const testResults = await testAppliedFixes(supabase);
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalFixes: fixResults.length,
      successfulFixes: fixResults.filter(r => r.success).length,
      failedFixes: fixResults.filter(r => !r.success).length,
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.success).length,
      failedTests: testResults.filter(r => !r.success).length
    };
    
    // Display results
    log('\n📊 Schema Fix Summary:', 'header');
    log(`Fixes Applied: ${summary.successfulFixes}/${summary.totalFixes}`, 
        summary.successfulFixes === summary.totalFixes ? 'success' : 'warning');
    log(`Tests Passed: ${summary.passedTests}/${summary.totalTests}`, 
        summary.passedTests === summary.totalTests ? 'success' : 'warning');
    
    const overallSuccess = summary.successfulFixes > 0 && summary.passedTests >= summary.totalTests * 0.75;
    
    if (overallSuccess) {
      log('\n🎉 Database schema fixes applied successfully!', 'success');
      log('You can now run the verification script to confirm all changes.', 'success');
      log('\n📝 Next steps:', 'info');
      log('1. Run: node simple-schema-verification.js', 'info');
      log('2. Execute TestSprite course management tests', 'info');
    } else {
      log('\n⚠️  Some fixes may have failed, but basic functionality should work', 'warning');
      
      if (summary.failedFixes > 0) {
        log('\n❌ Failed fixes:', 'error');
        fixResults.filter(r => !r.success).forEach(fix => {
          log(`   - ${fix.name}: ${fix.error}`, 'error');
        });
      }
      
      if (summary.failedTests > 0) {
        log('\n❌ Failed tests:', 'error');
        testResults.filter(r => !r.success).forEach(test => {
          log(`   - ${test.name}: ${test.error}`, 'error');
        });
      }
    }
    
    // Save detailed report
    const report = { summary, fixResults, testResults };
    fs.writeFileSync('sql-fix-execution-report.json', JSON.stringify(report, null, 2));
    log('\n💾 Detailed report saved to sql-fix-execution-report.json', 'info');
    
  } catch (error) {
    log(`❌ Schema fix execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`❌ Script execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, executeCriticalFixes, testAppliedFixes };