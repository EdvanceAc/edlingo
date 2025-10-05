# Browser-tools MCP Setup Guide for EdLingo

This guide will help you integrate Browser-tools MCP with your existing EdLingo project to enable AI-driven browser debugging and automation.

## Prerequisites

✅ **Already Available in Your Project:**
- Node.js v14+ (you have this)
- Existing MCP infrastructure in EdLingo
- MCP client utilities (`src/utils/mcpClient.js`)
- IPC handlers for MCP communication

🔧 **Additional Requirements:**
- Google Chrome browser
- Chrome remote debugging capabilities

## Step 1: Install Browser-tools MCP Server

```bash
# Install the browser-tools MCP server globally
npm install -g @agentdeskai/browser-tools-mcp

# Or install locally in your project
npm install @agentdeskai/browser-tools-mcp --save-dev
```

## Step 2: Enable Chrome Remote Debugging

### Option A: Manual Chrome Launch
```bash
# Close all Chrome instances first
# Then launch Chrome with remote debugging
chrome --remote-debugging-port=9223 --no-first-run --no-default-browser-check
```

### Option B: Automated Chrome Launch (Recommended)
We'll create a script to handle this automatically.

## Step 3: Update Your MCP Client

Your existing `src/utils/mcpClient.js` needs to be extended to support Browser-tools MCP:

```javascript
// Add to your existing mcpClient.js
export async function run_mcp(serverName, toolName, args) {
  try {
    // Existing PostgREST handling
    if (serverName === 'mcp.config.usrlocalmcp.Postgrest') {
      return await handlePostgrestRequest(toolName, args);
    }
    
    // NEW: Browser-tools MCP handling
    if (serverName === 'mcp.config.usrlocalmcp.BrowserTools') {
      return await handleBrowserToolsRequest(toolName, args);
    }
    
    throw new Error(`MCP server ${serverName} not implemented`);
  } catch (error) {
    console.error(`MCP call failed: ${serverName}.${toolName}`, error);
    throw error;
  }
}
```

## Step 4: Browser Tools Integration

The Browser-tools MCP provides these key tools:
- `getConsoleLogs` - Capture browser console logs
- `takeScreenshot` - Take page screenshots
- `navigate` - Navigate to URLs
- `click` - Click elements
- `type` - Type in input fields
- `evaluate` - Execute JavaScript
- `getNetworkLogs` - Monitor network requests

## Step 5: Configuration Files

Create the following configuration files:

### `.env` additions:
```env
# Browser debugging configuration
CHROME_DEBUG_PORT=9223
BROWSER_MCP_ENABLED=true
BROWSER_MCP_HOST=localhost
BROWSER_MCP_PORT=9223
```

## Step 6: Testing the Integration

1. **Start Chrome with debugging:**
   ```bash
   npm run chrome:debug
   ```

2. **Start Browser-tools MCP server:**
   ```bash
   npm run browser-mcp:start
   ```

3. **Test in your EdLingo app:**
   ```javascript
   // Example usage in your React components
   const testBrowserTools = async () => {
     try {
       // Navigate to a page
       await window.electronAPI.runMcp(
         'mcp.config.usrlocalmcp.BrowserTools',
         'navigate',
         { url: 'http://localhost:3002' }
       );
       
       // Take a screenshot
       const screenshot = await window.electronAPI.runMcp(
         'mcp.config.usrlocalmcp.BrowserTools',
         'takeScreenshot',
         { name: 'edlingo-homepage' }
       );
       
       // Get console logs
       const logs = await window.electronAPI.runMcp(
         'mcp.config.usrlocalmcp.BrowserTools',
         'getConsoleLogs',
         {}
       );
       
       console.log('Browser automation successful!', { screenshot, logs });
     } catch (error) {
       console.error('Browser automation failed:', error);
     }
   };
   ```

## Step 7: Integration with Your AI Chat

You can now use browser automation in your AI chat system:

```javascript
// In your chat components, you can now ask the AI to:
// "Please navigate to the admin dashboard and take a screenshot"
// "Check the console logs for any errors on the current page"
// "Click the login button and fill in the test credentials"
```

## Available Browser Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `navigate` | Navigate to URL | Debug page loading issues |
| `takeScreenshot` | Capture page/element | Visual regression testing |
| `getConsoleLogs` | Get console output | Debug JavaScript errors |
| `click` | Click elements | Automate user interactions |
| `type` | Type in inputs | Fill forms automatically |
| `evaluate` | Run JavaScript | Extract data or test functionality |
| `getNetworkLogs` | Monitor requests | Debug API calls |

## Troubleshooting

### Common Issues:

1. **Chrome not starting with debugging:**
   - Ensure all Chrome instances are closed
   - Check if port 9223 is available
   - Try a different port if needed

2. **MCP server connection failed:**
   - Verify Chrome is running with `--remote-debugging-port=9223`
   - Check if browser-tools-mcp is installed correctly
   - Ensure firewall isn't blocking the connection

3. **Permission errors:**
   - Run Chrome with appropriate permissions
   - Check if antivirus is blocking the connection

### Debug Commands:

```bash
# Check if Chrome debugging is active
curl http://localhost:9223/json

# Test MCP server directly
browser-tools-mcp --port 9223 --test

# Check available Chrome tabs
curl http://localhost:9223/json/list
```

## Security Considerations

⚠️ **Important Security Notes:**
- Only enable remote debugging in development
- Never expose debugging ports in production
- Use localhost-only connections
- Consider using authentication for MCP servers

## Next Steps

1. Run the setup scripts provided
2. Test basic browser automation
3. Integrate with your AI chat system
4. Create custom automation workflows
5. Add error handling and logging

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Chrome DevTools Protocol documentation
3. Check browser-tools-mcp GitHub repository
4. Ensure your existing MCP infrastructure is working

Your EdLingo project already has excellent MCP infrastructure, so adding Browser-tools should be straightforward!