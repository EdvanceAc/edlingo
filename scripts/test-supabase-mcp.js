#!/usr/bin/env node

/**
 * Test script for Supabase MCP integration
 * This script tests the Supabase MCP server capabilities through the MCP client
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import the MCP client (we'll use a simplified version for Node.js)
class SupabaseMCPTester {
  constructor() {
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    this.supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    this.accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    this.projectRef = process.env.SUPABASE_PROJECT_REF;
    
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`);
    try {
      const result = await testFunction();
      this.log(`✅ ${testName} - PASSED`, 'success');
      this.testResults.push({ name: testName, status: 'PASSED', result });
      return result;
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
      return null;
    }
  }

  async testEnvironmentVariables() {
    const required = {
      'SUPABASE_URL': this.supabaseUrl,
      'SUPABASE_ANON_KEY': this.supabaseKey,
      'SUPABASE_ACCESS_TOKEN': this.accessToken,
      'SUPABASE_PROJECT_REF': this.projectRef
    };

    const missing = [];
    for (const [key, value] of Object.entries(required)) {
      if (!value) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    return { message: 'All required environment variables are set', variables: Object.keys(required) };
  }

  async testSupabaseConnection() {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase connection failed: ${response.status} ${response.statusText}`);
    }

    return { message: 'Successfully connected to Supabase', status: response.status };
  }

  async testListTables() {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
    }

    const openApiSpec = await response.json();
    const tables = Object.keys(openApiSpec.paths || {})
      .filter(path => path.startsWith('/'))
      .map(path => path.substring(1))
      .filter(table => table && !table.includes('{'));

    return { message: `Found ${tables.length} tables`, tables };
  }

  async testCEFRQuestionsTable() {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/cefr_assessment_questions?limit=5`, {
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to query CEFR questions: ${response.status} ${response.statusText}`);
    }

    const questions = await response.json();
    return { 
      message: `Successfully queried CEFR questions table`, 
      count: questions.length,
      sample: questions.slice(0, 2)
    };
  }

  async testProjectsAPI() {
    if (!this.accessToken) {
      throw new Error('SUPABASE_ACCESS_TOKEN is required for projects API');
    }

    const response = await fetch('https://api.supabase.com/v1/projects', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Projects API failed: ${response.status} ${response.statusText}`);
    }

    const projects = await response.json();
    return { 
      message: `Successfully accessed projects API`, 
      projectCount: projects.length,
      currentProject: projects.find(p => p.ref === this.projectRef)?.name || 'Not found'
    };
  }

  async testMCPClientIntegration() {
    // Test if the MCP client file exists and has the Supabase handler
    const mcpClientPath = path.join(__dirname, '..', 'src', 'utils', 'mcpClient.js');
    
    if (!fs.existsSync(mcpClientPath)) {
      throw new Error('MCP client file not found');
    }

    const mcpClientContent = fs.readFileSync(mcpClientPath, 'utf8');
    
    if (!mcpClientContent.includes('handleSupabaseMCPRequest')) {
      throw new Error('Supabase MCP handler not found in MCP client');
    }

    if (!mcpClientContent.includes('mcp.config.usrlocalmcp.Supabase')) {
      throw new Error('Supabase MCP server name not configured in MCP client');
    }

    return { message: 'MCP client integration is properly configured' };
  }

  async testMCPConfiguration() {
    const mcpConfigPath = path.join(__dirname, '..', '.mcp.json');
    
    if (!fs.existsSync(mcpConfigPath)) {
      throw new Error('MCP configuration file (.mcp.json) not found');
    }

    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    
    if (!mcpConfig.mcpServers || !mcpConfig.mcpServers.supabase) {
      throw new Error('Supabase MCP server not configured in .mcp.json');
    }

    const supabaseConfig = mcpConfig.mcpServers.supabase;
    const requiredArgs = ['@supabase/mcp-server-supabase@latest', '--project-ref', '--access-token'];
    
    for (const arg of requiredArgs) {
      if (!supabaseConfig.args.some(a => a.includes(arg.split('=')[0]))) {
        throw new Error(`Missing required argument in MCP config: ${arg}`);
      }
    }

    return { message: 'MCP configuration is valid', config: supabaseConfig };
  }

  async runAllTests() {
    this.log('🚀 Starting Supabase MCP Integration Tests', 'info');
    this.log('=' .repeat(60), 'info');

    // Run all tests
    await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
    await this.runTest('Supabase Connection', () => this.testSupabaseConnection());
    await this.runTest('List Tables', () => this.testListTables());
    await this.runTest('CEFR Questions Table', () => this.testCEFRQuestionsTable());
    await this.runTest('Projects API', () => this.testProjectsAPI());
    await this.runTest('MCP Client Integration', () => this.testMCPClientIntegration());
    await this.runTest('MCP Configuration', () => this.testMCPConfiguration());

    // Summary
    this.log('\n' + '=' .repeat(60), 'info');
    this.log('📊 Test Results Summary', 'info');
    this.log('=' .repeat(60), 'info');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;

    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`, passed === total ? 'success' : 'warning');

    if (failed > 0) {
      this.log('\n❌ Failed Tests:', 'error');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => this.log(`  - ${r.name}: ${r.error}`, 'error'));
    }

    if (passed === total) {
      this.log('\n🎉 All tests passed! Supabase MCP integration is ready to use.', 'success');
      this.log('\n📚 Next steps:', 'info');
      this.log('  1. Update admin dashboard to use real Supabase data', 'info');
      this.log('  2. Validate MCP config with: npm run supabase-mcp:validate-config', 'info');
      this.log('  3. Use your MCP client (like Cursor) to interact with Supabase', 'info');
      this.log('  4. Review the setup guide: SUPABASE_MCP_SETUP.md', 'info');
    } else {
      this.log('\n⚠️  Some tests failed. Please check the configuration and try again.', 'warning');
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new SupabaseMCPTester();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = SupabaseMCPTester;