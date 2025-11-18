#!/usr/bin/env node

/**
 * Browser-tools MCP Setup Script for EdLingo
 * This script helps set up and configure Browser-tools MCP integration
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

class BrowserMCPSetup {
  constructor() {
    this.chromeDebugPort = process.env.CHROME_DEBUG_PORT || 9223;
    this.mcpPort = process.env.BROWSER_MCP_PORT || 9224;
    this.chromeProcess = null;
    this.mcpProcess = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔧',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');
    
    // Check if Chrome is installed
    const chromeInstalled = await this.isChromeInstalled();
    if (!chromeInstalled) {
      this.log('Google Chrome is not installed or not in PATH', 'error');
      return false;
    }
    
    // Check if browser-tools-mcp is installed
    const mcpInstalled = await this.isBrowserMCPInstalled();
    if (!mcpInstalled) {
      this.log('Browser-tools MCP is not installed. Installing...', 'warning');
      await this.installBrowserMCP();
    }
    
    this.log('Prerequisites check completed', 'success');
    return true;
  }

  async isChromeInstalled() {
    return new Promise((resolve) => {
      // Check if Chrome path is specified in environment
      const chromePath = process.env.CHROME_PATH;
      if (chromePath && fs.existsSync(chromePath)) {
        this.log(`Using Chrome from: ${chromePath}`, 'info');
        resolve(true);
        return;
      }
      
      const commands = {
        win32: 'where chrome',
        darwin: 'which google-chrome || which chrome',
        linux: 'which google-chrome || which chromium-browser'
      };
      
      const command = commands[os.platform()] || commands.linux;
      
      exec(command, (error) => {
        resolve(!error);
      });
    });
  }

  async isBrowserMCPInstalled() {
    return new Promise((resolve) => {
      exec('npm list -g @agentdeskai/browser-tools-mcp', (error) => {
        if (error) {
          // Check local installation
          exec('npm list @agentdeskai/browser-tools-mcp', (localError) => {
            resolve(!localError);
          });
        } else {
          resolve(true);
        }
      });
    });
  }

  async installBrowserMCP() {
    return new Promise((resolve, reject) => {
      this.log('Installing @agentdeskai/browser-tools-mcp...');
      
      const installProcess = spawn('npm', ['install', '-g', '@agentdeskai/browser-tools-mcp'], {
        stdio: 'inherit',
        shell: true
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          this.log('Browser-tools MCP installed successfully', 'success');
          resolve();
        } else {
          this.log('Failed to install Browser-tools MCP', 'error');
          reject(new Error(`Installation failed with code ${code}`));
        }
      });
    });
  }

  async startChrome() {
    return new Promise((resolve, reject) => {
      this.log(`Starting Chrome with remote debugging on port ${this.chromeDebugPort}...`);
      
      // Kill existing Chrome processes first
      this.killChromeProcesses();
      
      setTimeout(() => {
        // Use configured Chrome path or fallback to system commands
        let chromeCmd;
        const chromePath = process.env.CHROME_PATH;
        
        if (chromePath && fs.existsSync(chromePath)) {
          chromeCmd = chromePath;
          this.log(`Using Chrome from: ${chromePath}`, 'info');
        } else {
          const chromeCommands = {
            win32: 'chrome',
            darwin: 'google-chrome',
            linux: 'google-chrome'
          };
          chromeCmd = chromeCommands[os.platform()] || 'google-chrome';
        }
        
        const chromeArgs = [
          `--remote-debugging-port=${this.chromeDebugPort}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--user-data-dir=' + path.join(os.tmpdir(), 'chrome-debug-profile')
        ];
        
        this.chromeProcess = spawn(chromeCmd, chromeArgs, {
          detached: true,
          stdio: 'ignore'
        });
        
        this.chromeProcess.unref();
        
        // Wait a bit for Chrome to start
        setTimeout(() => {
          this.verifyChrome().then(resolve).catch(reject);
        }, 3000);
        
      }, 1000);
    });
  }

  killChromeProcesses() {
    const killCommands = {
      win32: 'taskkill /F /IM chrome.exe',
      darwin: 'pkill -f "Google Chrome"',
      linux: 'pkill -f chrome'
    };
    
    const killCmd = killCommands[os.platform()];
    if (killCmd) {
      exec(killCmd, () => {
        this.log('Existing Chrome processes terminated');
      });
    }
  }

  async verifyChrome() {
    return new Promise((resolve, reject) => {
      const http = require('http');
      
      const req = http.get(`http://localhost:${this.chromeDebugPort}/json`, (res) => {
        if (res.statusCode === 200) {
          this.log('Chrome debugging interface is active', 'success');
          resolve();
        } else {
          reject(new Error(`Chrome debugging interface returned status ${res.statusCode}`));
        }
      });
      
      req.on('error', (error) => {
        reject(new Error(`Failed to connect to Chrome debugging interface: ${error.message}`));
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout connecting to Chrome debugging interface'));
      });
    });
  }

  async startBrowserMCP() {
    return new Promise((resolve, reject) => {
      this.log(`Starting Browser-tools MCP server on port ${this.mcpPort}...`);
      
      // Use local installation path
      const mcpPath = path.join(__dirname, '..', 'node_modules', '.bin', 'browser-tools-mcp');
      const mcpCmd = os.platform() === 'win32' ? `${mcpPath}.cmd` : mcpPath;
      
      this.mcpProcess = spawn(mcpCmd, [
        '--port', this.chromeDebugPort.toString(),
        '--host', 'localhost'
      ], {
        stdio: 'pipe',
        shell: true
      });
      
      this.mcpProcess.stdout.on('data', (data) => {
        this.log(`MCP: ${data.toString().trim()}`);
      });
      
      this.mcpProcess.stderr.on('data', (data) => {
        this.log(`MCP Error: ${data.toString().trim()}`, 'error');
      });
      
      this.mcpProcess.on('close', (code) => {
        this.log(`Browser-tools MCP process exited with code ${code}`, code === 0 ? 'info' : 'error');
      });
      
      // Wait a bit for the server to start
      setTimeout(() => {
        this.log('Browser-tools MCP server started', 'success');
        resolve();
      }, 2000);
    });
  }

  async updatePackageJson() {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.log('package.json not found', 'warning');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add new scripts
    const newScripts = {
      'chrome:debug': 'node scripts/setup-browser-mcp.js --chrome-only',
      'browser-mcp:start': 'node scripts/setup-browser-mcp.js --mcp-only',
      'browser-mcp:setup': 'node scripts/setup-browser-mcp.js --full-setup',
      'browser-mcp:stop': 'node scripts/setup-browser-mcp.js --stop'
    };
    
    packageJson.scripts = { ...packageJson.scripts, ...newScripts };
    
    // Add browser-tools-mcp as dev dependency if not present
    if (!packageJson.devDependencies['@agentdeskai/browser-tools-mcp']) {
      packageJson.devDependencies['@agentdeskai/browser-tools-mcp'] = '^latest';
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    this.log('Updated package.json with browser MCP scripts', 'success');
  }

  async createEnvTemplate() {
    const envPath = path.join(__dirname, '..', '.env.browser-mcp');
    const envContent = `# Browser-tools MCP Configuration
CHROME_DEBUG_PORT=${this.chromeDebugPort}
BROWSER_MCP_ENABLED=true
BROWSER_MCP_HOST=localhost
BROWSER_MCP_PORT=${this.mcpPort}

# Security Settings
BROWSER_MCP_DEV_ONLY=true
BROWSER_MCP_LOCALHOST_ONLY=true
`;
    
    fs.writeFileSync(envPath, envContent);
    this.log('Created .env.browser-mcp configuration file', 'success');
  }

  async setup() {
    try {
      this.log('Starting Browser-tools MCP setup for EdLingo...');
      
      const args = process.argv.slice(2);
      
      if (args.includes('--stop')) {
        await this.stop();
        return;
      }
      
      const prerequisitesOk = await this.checkPrerequisites();
      if (!prerequisitesOk) {
        process.exit(1);
      }
      
      if (args.includes('--chrome-only')) {
        await this.startChrome();
        return;
      }
      
      if (args.includes('--mcp-only')) {
        await this.startBrowserMCP();
        return;
      }
      
      // Full setup
      await this.updatePackageJson();
      await this.createEnvTemplate();
      await this.startChrome();
      await this.startBrowserMCP();
      
      this.log('Browser-tools MCP setup completed successfully!', 'success');
      this.log('You can now use browser automation in your EdLingo AI chat');
      this.log(`Chrome debugging: http://localhost:${this.chromeDebugPort}`);
      this.log('Press Ctrl+C to stop the servers');
      
      // Keep the process alive
      process.on('SIGINT', () => {
        this.stop().then(() => process.exit(0));
      });
      
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async stop() {
    this.log('Stopping Browser-tools MCP services...');
    
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.log('Browser-tools MCP server stopped');
    }
    
    this.killChromeProcesses();
    this.log('Chrome debugging stopped');
    
    this.log('All services stopped', 'success');
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  const setup = new BrowserMCPSetup();
  setup.setup();
}

module.exports = BrowserMCPSetup;