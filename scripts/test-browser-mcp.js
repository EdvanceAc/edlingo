#!/usr/bin/env node

/**
 * Test script for Browser-tools MCP integration
 * This script tests the browser automation capabilities through the MCP client
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { run_mcp } = require('../src/utils/mcpClient');

// Load environment variables from .env.browser-mcp
const envPath = path.join(__dirname, '..', '.env.browser-mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  });
}

const CHROME_DEBUG_PORT = process.env.CHROME_DEBUG_PORT || 9223;
const TEST_URL = 'https://example.com';

class BrowserMCPTester {
  constructor() {
    this.chromeProcess = null;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async startChrome() {
    return new Promise((resolve, reject) => {
      this.log('Starting Chrome with remote debugging...');
      
      const chromeArgs = [
        `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
        '--no-first-run',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--headless=new' // Use new headless mode for testing
      ];

      // Use configured Chrome path or try different Chrome executable names
      const chromeExecutables = [];
      
      // Add configured Chrome path first if available
      if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
        chromeExecutables.push(process.env.CHROME_PATH);
      }
      
      // Add fallback executables
      chromeExecutables.push(
        'chrome',
        'google-chrome',
        'chromium',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      );

      let chromeStarted = false;
      let attemptCount = 0;
      
      const tryNextExecutable = () => {
        if (attemptCount >= chromeExecutables.length) {
          reject(new Error('Could not start Chrome. Please ensure Chrome is installed.'));
          return;
        }
        
        const executable = chromeExecutables[attemptCount];
        attemptCount++;
        
        this.log(`Trying Chrome executable: ${executable}`);
        
        try {
          this.chromeProcess = spawn(executable, chromeArgs, {
            stdio: 'pipe',
            detached: false,
            shell: true
          });

          this.chromeProcess.on('error', (error) => {
            this.log(`Chrome executable failed: ${executable} - ${error.message}`, 'warning');
            if (!chromeStarted) {
              tryNextExecutable();
            }
          });

          this.chromeProcess.on('spawn', () => {
            chromeStarted = true;
            this.log(`Chrome started successfully with ${executable} on port ${CHROME_DEBUG_PORT}`, 'success');
            // Wait a moment for Chrome to fully initialize
            setTimeout(resolve, 2000);
          });
          
          // Set a timeout to try next executable if this one doesn't start
          setTimeout(() => {
            if (!chromeStarted) {
              this.log(`Timeout waiting for ${executable} to start`, 'warning');
              if (this.chromeProcess) {
                this.chromeProcess.kill();
              }
              tryNextExecutable();
            }
          }, 3000);
          
        } catch (error) {
          this.log(`Failed to spawn ${executable}: ${error.message}`, 'warning');
          tryNextExecutable();
        }
      };
      
      tryNextExecutable();
    });
  }

  async stopChrome() {
    if (this.chromeProcess) {
      this.log('Stopping Chrome...');
      this.chromeProcess.kill('SIGTERM');
      this.chromeProcess = null;
    }
  }

  async testMCPFunction(toolName, args, description) {
    try {
      this.log(`Testing ${toolName}: ${description}`);
      
      const result = await run_mcp('mcp.config.usrlocalmcp.BrowserTools', toolName, args);
      
      if (result.error) {
        this.log(`${toolName} failed: ${result.error}`, 'error');
        this.testResults.push({ test: toolName, status: 'failed', error: result.error });
        return false;
      } else {
        this.log(`${toolName} succeeded`, 'success');
        this.testResults.push({ test: toolName, status: 'passed', data: result.data });
        return true;
      }
    } catch (error) {
      this.log(`${toolName} threw exception: ${error.message}`, 'error');
      this.testResults.push({ test: toolName, status: 'failed', error: error.message });
      return false;
    }
  }

  async runTests() {
    this.log('Starting Browser MCP Tests...', 'info');
    
    try {
      // Start Chrome
      await this.startChrome();
      
      // Wait for Chrome to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test 1: Navigate to a page
      await this.testMCPFunction(
        'navigate',
        { url: TEST_URL },
        'Navigate to example.com'
      );
      
      // Test 2: Get page info
      await this.testMCPFunction(
        'getPageInfo',
        {},
        'Get current page information'
      );
      
      // Test 3: Take a screenshot
      await this.testMCPFunction(
        'takeScreenshot',
        { filename: 'test-screenshot.png' },
        'Take a screenshot of the page'
      );
      
      // Test 4: Get console logs
      await this.testMCPFunction(
        'getConsoleLogs',
        {},
        'Retrieve console logs'
      );
      
      // Test 5: Evaluate JavaScript
      await this.testMCPFunction(
        'evaluate',
        { script: 'document.title' },
        'Execute JavaScript to get page title'
      );
      
      // Test 6: Get network logs
      await this.testMCPFunction(
        'getNetworkLogs',
        {},
        'Retrieve network activity logs'
      );
      
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
    } finally {
      await this.stopChrome();
    }
    
    this.printResults();
  }

  printResults() {
    this.log('\n=== Test Results ===', 'info');
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    
    this.testResults.forEach(result => {
      const status = result.status === 'passed' ? '✅' : '❌';
      this.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) {
        this.log(`   Error: ${result.error}`, 'error');
      }
    });
    
    this.log(`\nSummary: ${passed} passed, ${failed} failed`, 
      failed === 0 ? 'success' : 'warning');
    
    if (failed === 0) {
      this.log('🎉 All tests passed! Browser MCP integration is working correctly.', 'success');
    } else {
      this.log('⚠️  Some tests failed. Check the errors above for troubleshooting.', 'warning');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new BrowserMCPTester();
  
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\n🛑 Test interrupted by user');
    await tester.stopChrome();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await tester.stopChrome();
    process.exit(0);
  });
  
  tester.runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = BrowserMCPTester;