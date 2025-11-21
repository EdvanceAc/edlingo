# Browser MCP Quick Start Guide

This guide helps you quickly get started with the Browser-tools MCP integration in your EdLingo project.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Full Setup (Recommended)
```bash
npm run browser-mcp:setup
```

This command will:
- Install Browser-tools MCP if not present
- Start Chrome with remote debugging
- Start the MCP server
- Create necessary configuration files

### 3. Test the Integration
```bash
npm run browser-mcp:test
```

## 🎯 Available Commands

| Command | Description |
|---------|-------------|
| `npm run chrome:debug` | Start only Chrome with remote debugging |
| `npm run browser-mcp:start` | Start only the MCP server |
| `npm run browser-mcp:setup` | Full setup (Chrome + MCP server) |
| `npm run browser-mcp:stop` | Stop all browser MCP services |
| `npm run browser-mcp:test` | Run integration tests |

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

### 1. Start Chrome with Remote Debugging
```bash
chrome --remote-debugging-port=9223
```

### 2. Install Browser-tools MCP Globally
```bash
npm install -g @agentdeskai/browser-tools-mcp
```

### 3. Start MCP Server
```bash
browser-tools-mcp --port 9223
```

## 📋 Available Browser Actions

The integration supports these browser automation actions:

### Navigation
- `navigate` - Navigate to a URL
- `getPageInfo` - Get current page information

### Screenshots & Visual
- `takeScreenshot` - Capture page screenshots

### Interaction
- `click` - Click elements
- `type` - Type in input fields
- `hover` - Hover over elements
- `select` - Select dropdown options
- `waitForElement` - Wait for elements to appear

### Data Collection
- `getConsoleLogs` - Retrieve console logs
- `getNetworkLogs` - Get network activity
- `evaluate` - Execute JavaScript

## 💡 Usage Examples

### In Your Application Code
```javascript
import { run_mcp } from './src/utils/mcpClient';

// Navigate to a page
const result = await run_mcp(
  'mcp.config.usrlocalmcp.BrowserTools',
  'navigate',
  { url: 'https://example.com' }
);

// Take a screenshot
const screenshot = await run_mcp(
  'mcp.config.usrlocalmcp.BrowserTools',
  'takeScreenshot',
  { filename: 'page-capture.png' }
);

// Get console logs
const logs = await run_mcp(
  'mcp.config.usrlocalmcp.BrowserTools',
  'getConsoleLogs',
  {}
);
```

### Via Electron IPC
```javascript
// In renderer process
const result = await window.electronAPI.runMcp(
  'mcp.config.usrlocalmcp.BrowserTools',
  'navigate',
  { url: 'https://example.com' }
);
```

## 🔍 Troubleshooting

### Chrome Not Starting
- Ensure Chrome is installed and accessible
- Try different Chrome executable paths in the setup script
- Check if port 9223 is already in use

### MCP Server Connection Issues
- Verify Chrome is running with remote debugging enabled
- Check that the debug port matches between Chrome and MCP server
- Ensure no firewall is blocking the connection

### Permission Errors
- Run commands with appropriate permissions
- On Windows, try running as Administrator if needed

## 📁 Configuration Files

- `.env.browser-mcp` - Environment configuration
- `scripts/setup-browser-mcp.js` - Setup automation script
- `scripts/test-browser-mcp.js` - Integration test suite
- `src/utils/mcpClient.js` - MCP client implementation

## 🔒 Security Notes

- Chrome runs with reduced security for debugging
- Only use on development/testing environments
- Never expose the debug port to external networks
- The setup includes security-conscious defaults

## 📚 Next Steps

1. Run the test suite to verify everything works
2. Explore the available browser actions
3. Integrate browser automation into your workflows
4. Check the main setup guide for advanced configuration

For detailed setup instructions, see `BROWSER_TOOLS_MCP_SETUP.md`.