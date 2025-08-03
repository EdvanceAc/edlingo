#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * 
 * This script verifies that all database migrations have been properly applied
 * to the Supabase database, specifically checking for the missing columns
 * that were causing test failures.
 * 
 * Usage: node verify-database-schema.js
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
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
    log('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file', 'warning');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Schema verification queries
const VERIFICATION_QUERIES = {
  // Check user_progress table structure
  user_progress_columns: {
    name: 'User Progress Table Columns',
    query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_progress' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `,
    expectedColumns: [
      'id', 'user_id', 'current_level', 'total_xp', 'daily_streak', 
      'last_study_date', 'lessons_completed', 'created_at', 'updated_at'
    ]
  },
  
  // Check notifications table exists
  notifications_table: {
    name: 'Notifications Table Structure',
    query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `,
    expectedColumns: ['id', 'user_id', 'content', 'created_at', 'is_read', 'type']
  },
  
  // Check courses table structure
  courses_table: {
    name: 'Courses Table Structure',
    query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `,
    expectedColumns: ['id', 'title', 'description', 'language', 'difficulty_level', 'is_active']
  },
  
  // Check user_profiles table
  user_profiles_table: {
    name: 'User Profiles Table Structure',
    query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `,
    expectedColumns: ['id', 'user_id', 'email', 'full_name', 'created_at', 'updated_at']
  },
  
  // Check RLS policies
  rls_policies: {
    name: 'Row Level Security Policies',
    query: `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `
  },
  
  // Check indexes
  table_indexes: {
    name: 'Table Indexes',
    query: `
      SELECT 
        t.relname as table_name,
        i.relname as index_name,
        array_to_string(array_agg(a.attname), ', ') as column_names
      FROM 
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a,
        pg_namespace n
      WHERE 
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'public'
        AND t.relname IN ('user_progress', 'notifications', 'courses', 'user_profiles')
      GROUP BY 
        t.relname, i.relname
      ORDER BY 
        t.relname, i.relname;
    `
  }
};

// Verify specific column exists and has correct type
async function verifyColumn(supabase, tableName, columnName, expectedType = null) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND column_name = '${columnName}'
        AND table_schema = 'public';
      `
    });
    
    if (error) {
      // Fallback: try direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .eq('table_schema', 'public');
      
      if (fallbackError) {
        log(`❌ Cannot verify column ${tableName}.${columnName}: ${fallbackError.message}`, 'error');
        return false;
      }
      
      if (fallbackData && fallbackData.length > 0) {
        log(`✅ Column ${tableName}.${columnName} exists (${fallbackData[0].data_type})`, 'success');
        return true;
      } else {
        log(`❌ Column ${tableName}.${columnName} is missing`, 'error');
        return false;
      }
    }
    
    if (data && data.length > 0) {
      const column = data[0];
      log(`✅ Column ${tableName}.${columnName} exists (${column.data_type})`, 'success');
      if (expectedType && !column.data_type.toLowerCase().includes(expectedType.toLowerCase())) {
        log(`⚠️  Expected type ${expectedType}, found ${column.data_type}`, 'warning');
      }
      return true;
    } else {
      log(`❌ Column ${tableName}.${columnName} is missing`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Error verifying column ${tableName}.${columnName}: ${error.message}`, 'error');
    return false;
  }
}

// Test basic connectivity and data access
async function testBasicConnectivity(supabase) {
  log('🔍 Testing basic Supabase connectivity...', 'header');
  
  try {
    // Test user_profiles access
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      log(`❌ Cannot access user_profiles: ${profilesError.message}`, 'error');
      return false;
    }
    
    log('✅ user_profiles table accessible', 'success');
    
    // Test user_progress access (this was failing in tests)
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('id')
      .limit(1);
    
    if (progressError) {
      log(`❌ Cannot access user_progress: ${progressError.message}`, 'error');
      if (progressError.message.includes('lessons_completed')) {
        log('🔍 This confirms the missing lessons_completed column issue', 'warning');
      }
      return false;
    }
    
    log('✅ user_progress table accessible', 'success');
    return true;
    
  } catch (error) {
    log(`❌ Connectivity test failed: ${error.message}`, 'error');
    return false;
  }
}

// Verify critical missing columns that caused test failures
async function verifyCriticalColumns(supabase) {
  log('🔍 Verifying critical columns that caused test failures...', 'header');
  
  const criticalColumns = [
    { table: 'user_progress', column: 'lessons_completed', type: 'integer' },
    { table: 'user_progress', column: 'last_study_date', type: 'date' },
    { table: 'user_progress', column: 'current_level', type: 'integer' },
    { table: 'user_progress', column: 'total_xp', type: 'integer' },
    { table: 'user_progress', column: 'daily_streak', type: 'integer' }
  ];
  
  let allColumnsExist = true;
  
  for (const { table, column, type } of criticalColumns) {
    const exists = await verifyColumn(supabase, table, column, type);
    if (!exists) {
      allColumnsExist = false;
    }
  }
  
  return allColumnsExist;
}

// Verify notifications table (new requirement)
async function verifyNotificationsTable(supabase) {
  log('🔍 Verifying notifications table...', 'header');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (error) {
      log(`❌ Notifications table not accessible: ${error.message}`, 'error');
      return false;
    }
    
    log('✅ Notifications table exists and is accessible', 'success');
    
    // Verify notifications table structure
    const notificationColumns = ['id', 'user_id', 'content', 'created_at', 'is_read', 'type'];
    let allColumnsExist = true;
    
    for (const column of notificationColumns) {
      const exists = await verifyColumn(supabase, 'notifications', column);
      if (!exists) {
        allColumnsExist = false;
      }
    }
    
    return allColumnsExist;
    
  } catch (error) {
    log(`❌ Error verifying notifications table: ${error.message}`, 'error');
    return false;
  }
}

// Test the specific queries that were failing
async function testFailingQueries(supabase) {
  log('🔍 Testing queries that were failing in TestSprite...', 'header');
  
  const failingQueries = [
    {
      name: 'User Progress with lessons_completed',
      query: supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000001')
        .limit(1)
    },
    {
      name: 'User Progress basic select',
      query: supabase
        .from('user_progress')
        .select('id, user_id, current_level, total_xp, daily_streak, last_study_date')
        .limit(1)
    },
    {
      name: 'Notifications basic select',
      query: supabase
        .from('notifications')
        .select('id, user_id, content, created_at, is_read, type')
        .limit(1)
    }
  ];
  
  let allQueriesWork = true;
  
  for (const { name, query } of failingQueries) {
    try {
      const { data, error } = await query;
      
      if (error) {
        log(`❌ Query "${name}" failed: ${error.message}`, 'error');
        allQueriesWork = false;
      } else {
        log(`✅ Query "${name}" executed successfully`, 'success');
      }
    } catch (error) {
      log(`❌ Query "${name}" threw exception: ${error.message}`, 'error');
      allQueriesWork = false;
    }
  }
  
  return allQueriesWork;
}

// Generate migration status report
async function generateMigrationReport(supabase) {
  log('📊 Generating migration status report...', 'header');
  
  const report = {
    timestamp: new Date().toISOString(),
    connectivity: false,
    criticalColumns: false,
    notificationsTable: false,
    failingQueries: false,
    recommendations: []
  };
  
  // Test connectivity
  report.connectivity = await testBasicConnectivity(supabase);
  
  // Verify critical columns
  report.criticalColumns = await verifyCriticalColumns(supabase);
  
  // Verify notifications table
  report.notificationsTable = await verifyNotificationsTable(supabase);
  
  // Test failing queries
  report.failingQueries = await testFailingQueries(supabase);
  
  // Generate recommendations
  if (!report.connectivity) {
    report.recommendations.push('Fix basic Supabase connectivity issues');
  }
  
  if (!report.criticalColumns) {
    report.recommendations.push('Run database migrations to add missing columns');
    report.recommendations.push('Execute: node run-migrations.js');
    report.recommendations.push('Or manually run SQL from supabase-schema-fix.sql');
  }
  
  if (!report.notificationsTable) {
    report.recommendations.push('Create notifications table with proper structure');
  }
  
  if (!report.failingQueries) {
    report.recommendations.push('Fix database schema to resolve query failures');
  }
  
  return report;
}

// Main execution function
async function main() {
  console.log('🔧 EdLingo Database Schema Verification Tool');
  console.log('============================================\n');
  
  const supabase = initializeSupabase();
  if (!supabase) {
    process.exit(1);
  }
  
  log('✅ Supabase client initialized', 'success');
  
  try {
    const report = await generateMigrationReport(supabase);
    
    // Display final report
    log('\n📋 Migration Verification Report:', 'header');
    log(`Connectivity: ${report.connectivity ? '✅ PASS' : '❌ FAIL'}`, report.connectivity ? 'success' : 'error');
    log(`Critical Columns: ${report.criticalColumns ? '✅ PASS' : '❌ FAIL'}`, report.criticalColumns ? 'success' : 'error');
    log(`Notifications Table: ${report.notificationsTable ? '✅ PASS' : '❌ FAIL'}`, report.notificationsTable ? 'success' : 'error');
    log(`Failing Queries Fixed: ${report.failingQueries ? '✅ PASS' : '❌ FAIL'}`, report.failingQueries ? 'success' : 'error');
    
    const overallStatus = report.connectivity && report.criticalColumns && report.notificationsTable && report.failingQueries;
    log(`\n🎯 Overall Status: ${overallStatus ? '✅ ALL MIGRATIONS APPLIED' : '❌ MIGRATIONS INCOMPLETE'}`, overallStatus ? 'success' : 'error');
    
    if (report.recommendations.length > 0) {
      log('\n📝 Recommendations:', 'warning');
      report.recommendations.forEach((rec, index) => {
        log(`   ${index + 1}. ${rec}`, 'info');
      });
    }
    
    if (overallStatus) {
      log('\n🎉 Database schema is ready for course management testing!', 'success');
    } else {
      log('\n⚠️  Database schema issues must be resolved before testing', 'warning');
    }
    
    // Save report to file
    const fs = require('fs');
    fs.writeFileSync('database-verification-report.json', JSON.stringify(report, null, 2));
    log('\n💾 Detailed report saved to database-verification-report.json', 'info');
    
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

module.exports = { main, verifyColumn, testBasicConnectivity, verifyCriticalColumns };