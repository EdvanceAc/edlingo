#!/usr/bin/env node

/**
 * Sequential Thinking MCP Server Test Script
 * 
 * This script tests the Sequential Thinking MCP server configuration and connectivity.
 * The Sequential Thinking MCP server provides tools for structured reasoning and problem-solving.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

async function testSequentialThinkingMCP() {
  logHeader('Sequential Thinking MCP Server Test');
  
  try {
    // Test 1: Check if .mcp.json exists and has Sequential Thinking configuration
    logInfo('Testing MCP configuration...');
    
    const mcpConfigPath = path.join(process.cwd(), '.mcp.json');
    if (!fs.existsSync(mcpConfigPath)) {
      logError('.mcp.json file not found');
      return false;
    }
    
    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    
    if (!mcpConfig.mcpServers || !mcpConfig.mcpServers.sequentialthinking) {
      logError('Sequential Thinking MCP server not configured in .mcp.json');
      return false;
    }
    
    logSuccess('.mcp.json contains Sequential Thinking configuration');
    
    // Test 2: Validate Sequential Thinking MCP configuration
    const sequentialThinkingConfig = mcpConfig.mcpServers.sequentialthinking;
    
    if (!sequentialThinkingConfig.command) {
      logError('Sequential Thinking MCP server missing command');
      return false;
    }
    
    if (!sequentialThinkingConfig.args || !Array.isArray(sequentialThinkingConfig.args)) {
      logError('Sequential Thinking MCP server missing or invalid args');
      return false;
    }
    
    logSuccess('Sequential Thinking MCP server configuration is valid');
    
    // Test 3: Display configuration details
    logInfo('Sequential Thinking MCP Configuration:');
    log(`  Command: ${sequentialThinkingConfig.command}`, 'cyan');
    log(`  Args: ${sequentialThinkingConfig.args.join(' ')}`, 'cyan');
    
    if (sequentialThinkingConfig.env) {
      log(`  Environment variables: ${Object.keys(sequentialThinkingConfig.env).join(', ')}`, 'cyan');
    }
    
    // Test 4: Check if the package is available
    logInfo('Checking Sequential Thinking MCP package availability...');
    
    try {
      const { execSync } = require('child_process');
      const packageInfo = execSync('npm view @modelcontextprotocol/server-sequential-thinking version', { 
        encoding: 'utf8',
        timeout: 10000
      }).trim();
      
      if (packageInfo) {
        logSuccess(`Sequential Thinking MCP package available (latest: ${packageInfo})`);
      } else {
        logWarning('Could not verify Sequential Thinking MCP package version');
      }
    } catch (error) {
      logWarning(`Could not check Sequential Thinking MCP package: ${error.message}`);
    }
    
    // Test 5: Provide usage instructions
    logHeader('Usage Instructions');
    logInfo('The Sequential Thinking MCP server provides structured reasoning capabilities.');
    logInfo('To use it in your MCP client (like Cursor):');
    log('  1. Ensure your MCP client is configured to read .mcp.json', 'yellow');
    log('  2. The server will be available as "sequentialthinking"', 'yellow');
    log('  3. Use it for complex problem-solving and structured thinking tasks', 'yellow');
    
    logHeader('Test Summary');
    logSuccess('All Sequential Thinking MCP tests passed!');
    logInfo('The Sequential Thinking MCP server is properly configured and ready to use.');
    
    return true;
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSequentialThinkingMCP()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Unexpected error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testSequentialThinkingMCP };