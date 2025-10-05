/**
 * Enhanced MCP Client with Improved Authentication
 * 
 * This module provides an enhanced interface for MCP operations
 * with automatic authentication handling and SQL operation helpers.
 */

import { run_mcp } from './mcpClient.js';

/**
 * Enhanced MCP Client Class
 */
class EnhancedMCPClient {
  constructor() {
    this.serverName = 'mcp.config.usrlocalmcp.supabase';
    this.authRetryCount = 3;
    this.authRetryDelay = 1000; // 1 second
  }

  /**
   * Execute SQL with automatic authentication retry
   */
  async executeSQL(query, options = {}) {
    const { description = 'SQL Query', retryOnAuth = true } = options;
    
    console.log(`🔍 Executing SQL: ${description}`);
    console.log(`📝 Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.authRetryCount; attempt++) {
      try {
        const result = await run_mcp(this.serverName, 'execute_sql', {
          query: query
        });
        
        if (result && !result.error) {
          console.log(`✅ SQL executed successfully on attempt ${attempt}`);
          return {
            success: true,
            data: result,
            error: null,
            attempt
          };
        }
        
        lastError = result?.error || new Error('Unknown error');
        
        // Check if it's an authentication error
        if (this.isAuthError(lastError) && retryOnAuth && attempt < this.authRetryCount) {
          console.log(`⚠️ Authentication error on attempt ${attempt}, retrying...`);
          await this.delay(this.authRetryDelay * attempt);
          continue;
        }
        
        break;
        
      } catch (error) {
        lastError = error;
        
        if (this.isAuthError(error) && retryOnAuth && attempt < this.authRetryCount) {
          console.log(`⚠️ Authentication error on attempt ${attempt}, retrying...`);
          await this.delay(this.authRetryDelay * attempt);
          continue;
        }
        
        break;
      }
    }
    
    console.log(`❌ SQL execution failed: ${lastError?.message || 'Unknown error'}`);
    return {
      success: false,
      data: null,
      error: lastError,
      attempt: this.authRetryCount
    };
  }

  /**
   * Apply database migration with enhanced error handling
   */
  async applyMigration(name, query, options = {}) {
    const { description = `Migration: ${name}`, retryOnAuth = true } = options;
    
    console.log(`🚀 Applying migration: ${name}`);
    console.log(`📝 Description: ${description}`);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.authRetryCount; attempt++) {
      try {
        const result = await run_mcp(this.serverName, 'apply_migration', {
          name: name,
          query: query
        });
        
        if (result && !result.error) {
          console.log(`✅ Migration applied successfully on attempt ${attempt}`);
          return {
            success: true,
            data: result,
            error: null,
            attempt
          };
        }
        
        lastError = result?.error || new Error('Unknown error');
        
        if (this.isAuthError(lastError) && retryOnAuth && attempt < this.authRetryCount) {
          console.log(`⚠️ Authentication error on attempt ${attempt}, retrying...`);
          await this.delay(this.authRetryDelay * attempt);
          continue;
        }
        
        break;
        
      } catch (error) {
        lastError = error;
        
        if (this.isAuthError(error) && retryOnAuth && attempt < this.authRetryCount) {
          console.log(`⚠️ Authentication error on attempt ${attempt}, retrying...`);
          await this.delay(this.authRetryDelay * attempt);
          continue;
        }
        
        break;
      }
    }
    
    console.log(`❌ Migration failed: ${lastError?.message || 'Unknown error'}`);
    return {
      success: false,
      data: null,
      error: lastError,
      attempt: this.authRetryCount
    };
  }

  /**
   * List tables with authentication retry
   */
  async listTables(schemas = ['public']) {
    console.log(`📋 Listing tables in schemas: ${schemas.join(', ')}`);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.authRetryCount; attempt++) {
      try {
        const result = await run_mcp(this.serverName, 'list_tables', {
          schemas: schemas
        });
        
        if (result && !result.error) {
          console.log(`✅ Tables listed successfully on attempt ${attempt}`);
          return {
            success: true,
            data: result,
            error: null,
            attempt
          };
        }
        
        lastError = result?.error || new Error('Unknown error');
        
        if (this.isAuthError(lastError) && attempt < this.authRetryCount) {
          console.log(`⚠️ Authentication error on attempt ${attempt}, retrying...`);
          await this.delay(this.authRetryDelay * attempt);
          continue;
        }
        
        break;
        
      } catch (error) {
        lastError = error;
        
        if (this.isAuthError(error) && attempt < this.authRetryCount) {
          console.log(`⚠️ Authentication error on attempt ${attempt}, retrying...`);
          await this.delay(this.authRetryDelay * attempt);
          continue;
        }
        
        break;
      }
    }
    
    console.log(`❌ List tables failed: ${lastError?.message || 'Unknown error'}`);
    return {
      success: false,
      data: null,
      error: lastError,
      attempt: this.authRetryCount
    };
  }

  /**
   * Get project information
   */
  async getProjectInfo() {
    console.log(`🔍 Getting project information`);
    
    try {
      const [urlResult, keyResult] = await Promise.allSettled([
        run_mcp(this.serverName, 'get_project_url', {}),
        run_mcp(this.serverName, 'get_anon_key', {})
      ]);
      
      const projectUrl = urlResult.status === 'fulfilled' ? urlResult.value : null;
      const anonKey = keyResult.status === 'fulfilled' ? keyResult.value : null;
      
      return {
        success: true,
        data: {
          projectUrl,
          anonKey,
          urlError: urlResult.status === 'rejected' ? urlResult.reason : null,
          keyError: keyResult.status === 'rejected' ? keyResult.reason : null
        },
        error: null
      };
      
    } catch (error) {
      console.log(`❌ Get project info failed: ${error.message}`);
      return {
        success: false,
        data: null,
        error
      };
    }
  }

  /**
   * Test MCP server connectivity and authentication
   */
  async testConnectivity() {
    console.log(`🧪 Testing MCP server connectivity`);
    
    const tests = [
      {
        name: 'Project URL',
        test: () => run_mcp(this.serverName, 'get_project_url', {})
      },
      {
        name: 'List Tables',
        test: () => run_mcp(this.serverName, 'list_tables', { schemas: ['public'] })
      },
      {
        name: 'Execute Simple Query',
        test: () => run_mcp(this.serverName, 'execute_sql', { query: 'SELECT 1 as test;' })
      }
    ];
    
    const results = {};
    
    for (const { name, test } of tests) {
      try {
        console.log(`  Testing: ${name}`);
        const result = await test();
        
        if (result && !result.error) {
          console.log(`  ✅ ${name}: Success`);
          results[name] = { success: true, data: result };
        } else {
          console.log(`  ❌ ${name}: ${result?.error?.message || 'Unknown error'}`);
          results[name] = { success: false, error: result?.error?.message || 'Unknown error' };
        }
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
        results[name] = { success: false, error: error.message };
      }
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`🧪 Connectivity test completed: ${successCount}/${totalCount} tests passed`);
    
    return {
      success: successCount > 0,
      results,
      summary: {
        passed: successCount,
        total: totalCount,
        percentage: Math.round((successCount / totalCount) * 100)
      }
    };
  }

  /**
   * Batch execute multiple SQL statements
   */
  async executeBatch(statements, options = {}) {
    const { stopOnError = false, description = 'Batch SQL Execution' } = options;
    
    console.log(`🔄 ${description}: ${statements.length} statements`);
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const stepDescription = `${description} - Step ${i + 1}/${statements.length}`;
      
      const result = await this.executeSQL(statement, {
        description: stepDescription,
        retryOnAuth: true
      });
      
      results.push({
        statement,
        result,
        index: i
      });
      
      if (result.success) {
        successCount++;
      } else {
        console.log(`❌ Batch step ${i + 1} failed: ${result.error?.message}`);
        
        if (stopOnError) {
          console.log(`🛑 Stopping batch execution due to error`);
          break;
        }
      }
    }
    
    const summary = {
      total: statements.length,
      executed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      percentage: Math.round((successCount / results.length) * 100)
    };
    
    console.log(`🔄 Batch execution completed: ${summary.successful}/${summary.executed} successful (${summary.percentage}%)`);
    
    return {
      success: successCount === results.length,
      results,
      summary
    };
  }

  /**
   * Helper method to check if an error is authentication-related
   */
  isAuthError(error) {
    if (!error) return false;
    
    const authErrorMessages = [
      'access control',
      'privileges',
      'authentication',
      'unauthorized',
      'permission denied',
      'access denied',
      'invalid credentials',
      'token expired'
    ];
    
    const errorMessage = (error.message || error.toString()).toLowerCase();
    return authErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Helper method to add delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Common SQL operations with built-in retry logic
   */
  async commonOperations() {
    return {
      // List all tables
      listTables: () => this.listTables(['public']),
      
      // Check table structure
      describeTable: (tableName) => this.executeSQL(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `, { description: `Describe table: ${tableName}` }),
      
      // Check RLS policies
      checkRLSPolicies: (tableName) => this.executeSQL(`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = '${tableName}'
        ORDER BY policyname;
      `, { description: `Check RLS policies for: ${tableName}` }),
      
      // List migrations
      listMigrations: () => run_mcp(this.serverName, 'list_migrations', {}),
      
      // Get project logs
      getLogs: (service = 'api') => run_mcp(this.serverName, 'get_logs', { service }),
      
      // Generate TypeScript types
      generateTypes: () => run_mcp(this.serverName, 'generate_typescript_types', {})
    };
  }
}

// Create singleton instance
const enhancedMCPClient = new EnhancedMCPClient();

// Export both the class and singleton instance
export { EnhancedMCPClient, enhancedMCPClient };
export default enhancedMCPClient;

// Also export common operations for easy access
export const mcpSQL = {
  execute: (query, options) => enhancedMCPClient.executeSQL(query, options),
  migrate: (name, query, options) => enhancedMCPClient.applyMigration(name, query, options),
  listTables: (schemas) => enhancedMCPClient.listTables(schemas),
  batch: (statements, options) => enhancedMCPClient.executeBatch(statements, options),
  test: () => enhancedMCPClient.testConnectivity(),
  info: () => enhancedMCPClient.getProjectInfo()
};

// Console logging helper for browser environments
if (typeof window !== 'undefined') {
  window.mcpSQL = mcpSQL;
  console.log('🔧 Enhanced MCP SQL client available as window.mcpSQL');
}