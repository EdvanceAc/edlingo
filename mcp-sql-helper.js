#!/usr/bin/env node

/**
 * Enhanced MCP SQL Helper with Improved Authentication
 * 
 * This script provides an easy-to-use interface for SQL operations
 * through the Supabase MCP server with automatic authentication handling.
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
    case 'sql':
      color = colors.cyan;
      prefix = '🔍';
      break;
  }
  
  console.log(`${color}${prefix} [${timestamp}] ${message}${colors.reset}`);
}

class MCPSQLHelper {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    this.projectRef = process.env.SUPABASE_PROJECT_REF;
    
    this.validateConfig();
    this.initializeClients();
  }
  
  validateConfig() {
    const required = {
      'SUPABASE_URL': this.supabaseUrl,
      'SUPABASE_ANON_KEY': this.supabaseAnonKey,
      'SUPABASE_ACCESS_TOKEN': this.accessToken,
      'SUPABASE_PROJECT_REF': this.projectRef
    };
    
    const missing = Object.entries(required)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missing.length > 0) {
      log(`Missing required environment variables: ${missing.join(', ')}`, 'error');
      log('Please check your .env file configuration', 'warning');
      process.exit(1);
    }
    
    log('✅ All required environment variables found', 'success');
  }
  
  initializeClients() {
    // Initialize with anon key for regular operations
    this.anonClient = createClient(this.supabaseUrl, this.supabaseAnonKey);
    
    // Initialize with service role key for admin operations (if available)
    if (this.supabaseServiceKey) {
      this.serviceClient = createClient(this.supabaseUrl, this.supabaseServiceKey);
      log('✅ Both anon and service role clients initialized', 'success');
    } else {
      log('⚠️ Service role key not found - admin operations may be limited', 'warning');
    }
  }
  
  /**
   * Execute SQL with automatic client selection based on operation type
   */
  async executeSQL(sql, options = {}) {
    const { useServiceRole = false, description = 'SQL Query' } = options;
    
    log(`Executing: ${description}`, 'header');
    log(`SQL: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`, 'sql');
    
    try {
      // Choose appropriate client
      const client = (useServiceRole && this.serviceClient) ? this.serviceClient : this.anonClient;
      const clientType = (useServiceRole && this.serviceClient) ? 'service role' : 'anon';
      
      log(`Using ${clientType} client`, 'info');
      
      // For DDL operations, try to use RPC if available
      if (this.isDDLOperation(sql)) {
        log('Detected DDL operation - attempting with elevated permissions', 'warning');
        
        if (this.serviceClient) {
          const { data, error } = await this.serviceClient.rpc('exec_sql', { sql_query: sql });
          
          if (error) {
            log(`RPC Error: ${error.message}`, 'error');
            return { success: false, error, data: null };
          }
          
          log(`✅ DDL operation completed successfully`, 'success');
          return { success: true, data, error: null };
        } else {
          log('Service role client not available for DDL operations', 'error');
          return { success: false, error: new Error('DDL operations require service role key'), data: null };
        }
      }
      
      // For SELECT operations, try direct query first, then RPC
      if (this.isSelectOperation(sql)) {
        const tableName = this.extractTableName(sql);
        if (tableName && !sql.toLowerCase().includes('information_schema')) {
          // Special case for user_profiles to prevent select=* causing ERR_ABORTED
          let data, error;
          if (tableName === 'user_profiles') {
            ({ data, error } = await client.from(tableName).select('id'));
          } else {
            ({ data, error } = await client.from(tableName).select('*'));
          }
          
          if (error) {
            log(`Direct query failed, trying RPC: ${error.message}`, 'warning');
          } else {
            log(`✅ Query completed - ${data?.length || 0} rows returned`, 'success');
            return { success: true, data, error: null };
          }
        }
      }
      
      // For other operations, try RPC
      const { data, error } = await client.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        log(`Error: ${error.message}`, 'error');
        return { success: false, error, data: null };
      }
      
      log(`✅ Operation completed successfully`, 'success');
      return { success: true, data, error: null };
      
    } catch (error) {
      log(`Exception: ${error.message}`, 'error');
      return { success: false, error, data: null };
    }
  }
  
  /**
   * Execute multiple SQL statements in sequence
   */
  async executeBatch(sqlStatements, options = {}) {
    log(`Executing batch of ${sqlStatements.length} SQL statements`, 'header');
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      const description = `Batch Statement ${i + 1}/${sqlStatements.length}`;
      
      const result = await this.executeSQL(sql, { ...options, description });
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        log(`Batch statement ${i + 1} failed: ${result.error?.message}`, 'error');
        
        if (options.stopOnError) {
          log('Stopping batch execution due to error', 'warning');
          break;
        }
      }
    }
    
    log(`Batch execution completed: ${successCount}/${sqlStatements.length} successful`, 
        successCount === sqlStatements.length ? 'success' : 'warning');
    
    return {
      success: successCount === sqlStatements.length,
      results,
      successCount,
      totalCount: sqlStatements.length
    };
  }
  
  /**
   * Test database connectivity with different authentication levels
   */
  async testConnectivity() {
    log('Testing database connectivity with different authentication levels', 'header');
    
    const tests = [
      {
        name: 'Anon Client - Public Tables',
        test: () => this.anonClient.from('grammar_lessons').select('id').limit(1)
      },
      {
        name: 'Anon Client - User Tables',
        test: () => this.anonClient.from('user_profiles').select('id').limit(1)
      }
    ];
    
    if (this.serviceClient) {
      tests.push({
        name: 'Service Role - Admin Access',
        test: () => this.serviceClient.from('user_profiles').select('id').limit(1)
      });
    }
    
    const results = {};
    
    for (const { name, test } of tests) {
      try {
        const { data, error } = await test();
        
        if (error) {
          log(`❌ ${name}: ${error.message}`, 'error');
          results[name] = { success: false, error: error.message };
        } else {
          log(`✅ ${name}: Connected successfully`, 'success');
          results[name] = { success: true, rowCount: data?.length || 0 };
        }
      } catch (err) {
        log(`❌ ${name}: ${err.message}`, 'error');
        results[name] = { success: false, error: err.message };
      }
    }
    
    return results;
  }
  
  // Helper methods
  isDDLOperation(sql) {
    const ddlKeywords = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'GRANT', 'REVOKE'];
    const upperSQL = sql.trim().toUpperCase();
    return ddlKeywords.some(keyword => upperSQL.startsWith(keyword));
  }
  
  isSelectOperation(sql) {
    return sql.trim().toUpperCase().startsWith('SELECT');
  }
  
  extractTableName(sql) {
    const match = sql.match(/FROM\s+([\w_]+)/i);
    return match ? match[1] : null;
  }
  
  /**
   * Common SQL operations with built-in error handling
   */
  async listTables() {
    const sql = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    return await this.executeSQL(sql, { 
      description: 'List all tables',
      useServiceRole: true 
    });
  }
  
  async describeTable(tableName) {
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;
    
    return await this.executeSQL(sql, { 
      description: `Describe table: ${tableName}`,
      useServiceRole: true 
    });
  }
  
  async checkRLSPolicies(tableName) {
    const sql = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = '${tableName}'
      ORDER BY policyname;
    `;
    
    return await this.executeSQL(sql, { 
      description: `Check RLS policies for: ${tableName}`,
      useServiceRole: true 
    });
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const helper = new MCPSQLHelper();
  
  switch (command) {
    case 'test':
      helper.testConnectivity()
        .then(results => {
          console.log('\n📊 Connectivity Test Results:');
          Object.entries(results).forEach(([name, result]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${name}: ${result.success ? 'OK' : result.error}`);
          });
        })
        .catch(error => {
          log(`Test failed: ${error.message}`, 'error');
          process.exit(1);
        });
      break;
      
    case 'tables':
      helper.listTables()
        .then(result => {
          if (result.success) {
            console.log('\n📋 Database Tables:');
            result.data?.forEach(table => {
              console.log(`  - ${table.table_name} (${table.table_type})`);
            });
          } else {
            log(`Failed to list tables: ${result.error?.message}`, 'error');
          }
        })
        .catch(error => {
          log(`Command failed: ${error.message}`, 'error');
          process.exit(1);
        });
      break;
      
    case 'describe':
      const tableName = args[1];
      if (!tableName) {
        log('Usage: node mcp-sql-helper.js describe <table_name>', 'error');
        process.exit(1);
      }
      
      helper.describeTable(tableName)
        .then(result => {
          if (result.success) {
            console.log(`\n📋 Table Structure: ${tableName}`);
            result.data?.forEach(col => {
              console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
          } else {
            log(`Failed to describe table: ${result.error?.message}`, 'error');
          }
        })
        .catch(error => {
          log(`Command failed: ${error.message}`, 'error');
          process.exit(1);
        });
      break;
      
    case 'sql':
      const sqlQuery = args.slice(1).join(' ');
      if (!sqlQuery) {
        log('Usage: node mcp-sql-helper.js sql "SELECT * FROM table_name"', 'error');
        process.exit(1);
      }
      
      helper.executeSQL(sqlQuery, { useServiceRole: true })
        .then(result => {
          if (result.success) {
            console.log('\n📊 Query Results:');
            if (Array.isArray(result.data)) {
              console.log(`Found ${result.data.length} rows`);
              result.data.slice(0, 10).forEach((row, i) => {
                console.log(`${i + 1}:`, JSON.stringify(row, null, 2));
              });
              if (result.data.length > 10) {
                console.log(`... and ${result.data.length - 10} more rows`);
              }
            } else {
              console.log(JSON.stringify(result.data, null, 2));
            }
          } else {
            log(`Query failed: ${result.error?.message}`, 'error');
          }
        })
        .catch(error => {
          log(`Command failed: ${error.message}`, 'error');
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
🔧 MCP SQL Helper - Enhanced Database Operations

Usage:
  node mcp-sql-helper.js test              # Test connectivity
  node mcp-sql-helper.js tables            # List all tables
  node mcp-sql-helper.js describe <table>  # Describe table structure
  node mcp-sql-helper.js sql "<query>"      # Execute SQL query

Examples:
  node mcp-sql-helper.js test
  node mcp-sql-helper.js tables
  node mcp-sql-helper.js describe user_profiles
  node mcp-sql-helper.js sql "SELECT * FROM grammar_lessons LIMIT 5"
`);
      break;
  }
}

module.exports = MCPSQLHelper;