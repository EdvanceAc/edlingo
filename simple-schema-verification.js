#!/usr/bin/env node

/**
 * Simple Database Schema Verification Script
 * 
 * This script verifies database schema by directly testing column access
 * instead of using information_schema which may have permission issues.
 * 
 * Usage: node simple-schema-verification.js
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

// Test column existence by attempting to select it
async function testColumnExists(supabase, tableName, columnName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        log(`❌ Column ${tableName}.${columnName} does not exist`, 'error');
        return false;
      } else {
        log(`⚠️  Column ${tableName}.${columnName} test inconclusive: ${error.message}`, 'warning');
        return null; // Inconclusive
      }
    }
    
    log(`✅ Column ${tableName}.${columnName} exists and is accessible`, 'success');
    return true;
    
  } catch (error) {
    log(`❌ Error testing column ${tableName}.${columnName}: ${error.message}`, 'error');
    return false;
  }
}

// Test table existence and basic access
async function testTableExists(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        log(`❌ Table ${tableName} does not exist`, 'error');
        return false;
      } else {
        log(`⚠️  Table ${tableName} exists but has access issues: ${error.message}`, 'warning');
        return true; // Table exists but may have RLS or other issues
      }
    }
    
    log(`✅ Table ${tableName} exists and is accessible`, 'success');
    return true;
    
  } catch (error) {
    log(`❌ Error testing table ${tableName}: ${error.message}`, 'error');
    return false;
  }
}

// Comprehensive schema verification
async function verifyDatabaseSchema(supabase) {
  log('🔍 Starting comprehensive database schema verification...', 'header');
  
  const results = {
    tables: {},
    columns: {},
    criticalIssues: [],
    recommendations: []
  };
  
  // Define critical tables and their required columns
  const criticalSchema = {
    user_profiles: ['id', 'user_id', 'email', 'full_name', 'created_at', 'updated_at'],
    user_progress: ['id', 'user_id', 'current_level', 'total_xp', 'daily_streak', 'last_study_date', 'lessons_completed', 'created_at', 'updated_at'],
    notifications: ['id', 'user_id', 'content', 'created_at', 'is_read', 'type'],
    courses: ['id', 'title', 'description', 'language', 'difficulty_level', 'is_active'],
    lessons: ['id', 'course_id', 'title', 'content', 'order_index']
  };
  
  // Test each table
  for (const [tableName, requiredColumns] of Object.entries(criticalSchema)) {
    log(`\n🔍 Testing table: ${tableName}`, 'header');
    
    const tableExists = await testTableExists(supabase, tableName);
    results.tables[tableName] = tableExists;
    
    if (!tableExists) {
      results.criticalIssues.push(`Table ${tableName} is missing`);
      continue;
    }
    
    // Test each required column
    results.columns[tableName] = {};
    for (const columnName of requiredColumns) {
      const columnExists = await testColumnExists(supabase, tableName, columnName);
      results.columns[tableName][columnName] = columnExists;
      
      if (columnExists === false) {
        results.criticalIssues.push(`Column ${tableName}.${columnName} is missing`);
      }
    }
  }
  
  return results;
}

// Test the specific failing scenarios from TestSprite
async function testFailingScenarios(supabase) {
  log('\n🔍 Testing specific failing scenarios from TestSprite...', 'header');
  
  const scenarios = [
    {
      name: 'User Progress Query with lessons_completed',
      test: async () => {
        const { data, error } = await supabase
          .from('user_progress')
          .select('id, user_id, lessons_completed, last_study_date, current_level, total_xp, daily_streak')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Insert into user_progress with all columns',
      test: async () => {
        // Test insert capability (will rollback)
        const testUserId = '00000000-0000-0000-0000-000000000001';
        const { data, error } = await supabase
          .from('user_progress')
          .insert({
            user_id: testUserId,
            current_level: 1,
            total_xp: 0,
            daily_streak: 0,
            last_study_date: new Date().toISOString().split('T')[0],
            lessons_completed: 0
          })
          .select()
          .limit(1);
        
        // Clean up test data if insert succeeded
        if (!error && data && data.length > 0) {
          await supabase
            .from('user_progress')
            .delete()
            .eq('id', data[0].id);
        }
        
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Notifications table full functionality',
      test: async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, user_id, content, created_at, is_read, type')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Course management queries',
      test: async () => {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, language, difficulty_level, is_active')
          .limit(1);
        return { success: !error, error: error?.message };
      }
    }
  ];
  
  const scenarioResults = [];
  
  for (const scenario of scenarios) {
    try {
      const result = await scenario.test();
      if (result.success) {
        log(`✅ ${scenario.name}: PASSED`, 'success');
      } else {
        log(`❌ ${scenario.name}: FAILED - ${result.error}`, 'error');
      }
      scenarioResults.push({ name: scenario.name, ...result });
    } catch (error) {
      log(`❌ ${scenario.name}: ERROR - ${error.message}`, 'error');
      scenarioResults.push({ name: scenario.name, success: false, error: error.message });
    }
  }
  
  return scenarioResults;
}

// Generate comprehensive report
async function generateComprehensiveReport(supabase) {
  const report = {
    timestamp: new Date().toISOString(),
    schemaVerification: null,
    scenarioTests: null,
    overallStatus: 'UNKNOWN',
    criticalIssues: [],
    recommendations: [],
    readyForTesting: false
  };
  
  try {
    // Verify schema
    report.schemaVerification = await verifyDatabaseSchema(supabase);
    
    // Test failing scenarios
    report.scenarioTests = await testFailingScenarios(supabase);
    
    // Analyze results
    const allTablesExist = Object.values(report.schemaVerification.tables).every(exists => exists);
    const allColumnsExist = Object.values(report.schemaVerification.columns)
      .every(tableColumns => Object.values(tableColumns).every(exists => exists === true));
    const allScenariosPass = report.scenarioTests.every(scenario => scenario.success);
    
    report.criticalIssues = report.schemaVerification.criticalIssues;
    
    if (allTablesExist && allColumnsExist && allScenariosPass) {
      report.overallStatus = 'READY';
      report.readyForTesting = true;
      report.recommendations.push('✅ Database schema is complete and ready for course management testing');
    } else {
      report.overallStatus = 'NEEDS_FIXES';
      report.readyForTesting = false;
      
      if (!allTablesExist) {
        report.recommendations.push('Create missing database tables');
      }
      
      if (!allColumnsExist) {
        report.recommendations.push('Run database migrations: node run-migrations.js');
        report.recommendations.push('Or manually execute SQL from supabase-schema-fix.sql');
      }
      
      if (!allScenariosPass) {
        report.recommendations.push('Fix database access and query issues');
      }
    }
    
  } catch (error) {
    report.overallStatus = 'ERROR';
    report.criticalIssues.push(`Verification failed: ${error.message}`);
    report.recommendations.push('Check Supabase connection and credentials');
  }
  
  return report;
}

// Main execution
async function main() {
  console.log('🔧 EdLingo Simple Database Schema Verification');
  console.log('==============================================\n');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    process.exit(1);
  }
  
  log('✅ Supabase client initialized', 'success');
  
  try {
    const report = await generateComprehensiveReport(supabase);
    
    // Display results
    log('\n📋 Final Verification Report:', 'header');
    log(`Overall Status: ${report.overallStatus}`, report.readyForTesting ? 'success' : 'error');
    log(`Ready for Testing: ${report.readyForTesting ? '✅ YES' : '❌ NO'}`, report.readyForTesting ? 'success' : 'error');
    
    if (report.criticalIssues.length > 0) {
      log('\n🚨 Critical Issues:', 'error');
      report.criticalIssues.forEach((issue, index) => {
        log(`   ${index + 1}. ${issue}`, 'error');
      });
    }
    
    if (report.recommendations.length > 0) {
      log('\n📝 Recommendations:', 'warning');
      report.recommendations.forEach((rec, index) => {
        log(`   ${index + 1}. ${rec}`, 'info');
      });
    }
    
    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync('simple-schema-verification-report.json', JSON.stringify(report, null, 2));
    log('\n💾 Detailed report saved to simple-schema-verification-report.json', 'info');
    
    if (report.readyForTesting) {
      log('\n🎉 Database is ready for course management testing!', 'success');
      log('You can now proceed with TestSprite course management tests.', 'success');
    } else {
      log('\n⚠️  Database schema must be fixed before testing can proceed.', 'warning');
    }
    
  } catch (error) {
    log(`❌ Verification failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  main().catch(error => {
    log(`❌ Script execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, testColumnExists, testTableExists };