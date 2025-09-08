// MCP Client Utility for EdLingo
// Handles communication with MCP servers, particularly PostgREST for database operations

/**
 * Run MCP server tool
 * @param {string} serverName - Name of the MCP server
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Arguments for the tool
 * @returns {Promise<any>} Tool execution result
 */
export async function run_mcp(serverName, toolName, args) {
  try {
    // For PostgREST operations, we'll use direct HTTP requests
    if (serverName === 'mcp.config.usrlocalmcp.Postgrest') {
      return await handlePostgrestRequest(toolName, args);
    }
    
    // For Browser-tools MCP operations
    if (serverName === 'mcp.config.usrlocalmcp.BrowserTools') {
      return await handleBrowserToolsRequest(toolName, args);
    }
    
    // For Supabase MCP operations
    if (serverName === 'mcp.config.usrlocalmcp.Supabase') {
      return await handleSupabaseMCPRequest(toolName, args);
    }
    
    // For other MCP servers, implement as needed
    throw new Error(`MCP server ${serverName} not implemented`);
    
  } catch (error) {
    console.error(`MCP call failed: ${serverName}.${toolName}`, error);
    throw error;
  }
}

/**
 * Handle PostgREST API requests
 * @param {string} toolName - Tool name (postgrestRequest or sqlToRest)
 * @param {Object} args - Request arguments
 * @returns {Promise<any>} API response
 */

/**
 * Fetch with retry logic for more reliable API calls
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, Math.floor(delay * 1.5));
    }
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, Math.floor(delay * 1.5));
  }
}
async function handlePostgrestRequest(toolName, args) {
  const baseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:3000';
  const apiKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (toolName === 'postgrestRequest') {
    const { method, path, body } = args;
    
    const url = `${baseUrl}/rest/v1${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    };
    
    // Add prefer header for POST operations
    if (method === 'POST') {
      headers['Prefer'] = 'return=representation';
    }
    
    const requestOptions = {
      method,
      headers
    };
    
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetchWithRetry(url, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PostgREST request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Handle different response types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    }
    
    return await response.text();
  }
  
  if (toolName === 'sqlToRest') {
    // Convert SQL to REST API call
    const { sql } = args;
    return convertSqlToRest(sql);
  }
  
  throw new Error(`Unknown PostgREST tool: ${toolName}`);
}

/**
 * Handle Browser-tools MCP requests
 * @param {string} toolName - Tool name (navigate, takeScreenshot, getConsoleLogs, etc.)
 * @param {Object} args - Request arguments
 * @returns {Promise<any>} Browser automation result
 */
async function handleBrowserToolsRequest(toolName, args) {
  const chromeDebugPort = process.env.CHROME_DEBUG_PORT || 9223;
  const baseUrl = `http://localhost:${chromeDebugPort}`;
  
  // Check if Chrome debugging is available
  try {
    await fetch(`${baseUrl}/json`);
  } catch (error) {
    throw new Error(`Chrome debugging interface not available on port ${chromeDebugPort}. Please start Chrome with --remote-debugging-port=${chromeDebugPort}`);
  }
  
  switch (toolName) {
    case 'navigate':
      return await navigateToUrl(args.url, baseUrl);
    
    case 'takeScreenshot':
      return await takeScreenshot(args, baseUrl);
    
    case 'getConsoleLogs':
      return await getConsoleLogs(baseUrl);
    
    case 'click':
      return await clickElement(args.selector, baseUrl);
    
    case 'type':
    case 'fill':
      return await typeInElement(args.selector, args.value, baseUrl);
    
    case 'evaluate':
      return await evaluateJavaScript(args.script, baseUrl);
    
    case 'getNetworkLogs':
      return await getNetworkLogs(baseUrl);
    
    case 'hover':
      return await hoverElement(args.selector, baseUrl);
    
    case 'select':
      return await selectOption(args.selector, args.value, baseUrl);
    
    case 'waitForElement':
      return await waitForElement(args.selector, args.timeout || 5000, baseUrl);
    
    case 'getPageInfo':
      return await getPageInfo(baseUrl);
    
    default:
      throw new Error(`Unknown Browser-tools tool: ${toolName}`);
  }
}

/**
 * Handle Supabase MCP requests
 * @param {string} toolName - Tool name (execute_sql, create_table, list_tables, etc.)
 * @param {Object} args - Request arguments
 * @returns {Promise<any>} Supabase MCP result
 */
async function handleSupabaseMCPRequest(toolName, args) {
  // Note: This is a client-side implementation that simulates MCP calls
  // In a real MCP environment, these would be handled by the MCP server
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };
  
  switch (toolName) {
    case 'execute_sql':
      return await executeSupabaseSQL(args.sql, supabaseUrl, headers);
    
    case 'list_tables':
      return await listSupabaseTables(supabaseUrl, headers);
    
    case 'create_table':
      return await createSupabaseTable(args, supabaseUrl, headers);
    
    case 'apply_migration':
      return await applySupabaseMigration(args.sql, supabaseUrl, headers);
    
    case 'list_projects':
      return await listSupabaseProjects();
    
    case 'fetch_config':
      return await fetchSupabaseConfig(supabaseUrl, headers);
    
    case 'generate_types':
      return await generateSupabaseTypes(supabaseUrl, headers);
    
    default:
      throw new Error(`Unknown Supabase MCP tool: ${toolName}`);
  }
}

/**
 * Execute SQL query via Supabase
 * @param {string} sql - SQL query to execute
 * @param {string} supabaseUrl - Supabase project URL
 * @param {Object} headers - Request headers
 * @returns {Promise<any>} Query result
 */
async function executeSupabaseSQL(sql, supabaseUrl, headers) {
  // For SELECT queries, try to convert to REST API calls
  if (sql.toLowerCase().trim().startsWith('select')) {
    try {
      const restCall = convertSqlToRest(sql);
      const response = await fetchWithRetry(`${supabaseUrl}/rest/v1${restCall.path}`, {
        method: restCall.method,
        headers
      });
      
      if (!response.ok) {
        throw new Error(`SQL execution failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to convert SQL to REST, falling back to RPC:', error.message);
    }
  }
  
  // For other queries, use RPC function (if available)
  const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql })
  });
  
  if (!response.ok) {
    throw new Error(`SQL execution failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * List tables in Supabase database
 * @param {string} supabaseUrl - Supabase project URL
 * @param {Object} headers - Request headers
 * @returns {Promise<any>} List of tables
 */
async function listSupabaseTables(supabaseUrl, headers) {
  const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list tables: ${response.status} ${response.statusText}`);
  }
  
  // Parse OpenAPI spec to get table names
  const openApiSpec = await response.json();
  const tables = Object.keys(openApiSpec.paths || {})
    .filter(path => path.startsWith('/'))
    .map(path => path.substring(1))
    .filter(table => table && !table.includes('{'));
  
  return tables;
}

/**
 * Create table in Supabase (via SQL execution)
 * @param {Object} args - Table creation arguments
 * @param {string} supabaseUrl - Supabase project URL
 * @param {Object} headers - Request headers
 * @returns {Promise<any>} Creation result
 */
async function createSupabaseTable(args, supabaseUrl, headers) {
  const { name, columns } = args;
  
  // Build CREATE TABLE SQL
  let sql = `CREATE TABLE ${name} (`;
  const columnDefs = columns.map(col => {
    return `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`;
  });
  sql += columnDefs.join(', ') + ');';
  
  return await executeSupabaseSQL(sql, supabaseUrl, headers);
}

/**
 * Apply migration to Supabase
 * @param {string} sql - Migration SQL
 * @param {string} supabaseUrl - Supabase project URL
 * @param {Object} headers - Request headers
 * @returns {Promise<any>} Migration result
 */
async function applySupabaseMigration(sql, supabaseUrl, headers) {
  return await executeSupabaseSQL(sql, supabaseUrl, headers);
}

/**
 * List Supabase projects (requires access token)
 * @returns {Promise<any>} List of projects
 */
async function listSupabaseProjects() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN environment variable is required for project management');
  }
  
  const response = await fetchWithRetry('https://api.supabase.com/v1/projects', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Fetch Supabase project configuration
 * @param {string} supabaseUrl - Supabase project URL
 * @param {Object} headers - Request headers
 * @returns {Promise<any>} Project configuration
 */
async function fetchSupabaseConfig(supabaseUrl, headers) {
  // Return basic configuration info
  return {
    url: supabaseUrl,
    hasAuth: true,
    hasDatabase: true,
    hasStorage: true,
    hasEdgeFunctions: true
  };
}

/**
 * Generate TypeScript types for Supabase
 * @param {string} supabaseUrl - Supabase project URL
 * @param {Object} headers - Request headers
 * @returns {Promise<any>} Generated types
 */
async function generateSupabaseTypes(supabaseUrl, headers) {
  // This would typically require the Supabase CLI
  // For now, return a placeholder
  return {
    message: 'Type generation requires Supabase CLI. Run: supabase gen types typescript --project-id YOUR_PROJECT_ID'
  };
}

/**
 * Convert SQL query to PostgREST API request
 * @param {string} sql - SQL query
 * @returns {Object} REST API request details
 */
function convertSqlToRest(sql) {
  // Basic SQL to REST conversion
  // This is a simplified implementation - in production, you'd want a more robust parser
  
  const sqlLower = sql.toLowerCase().trim();
  
  if (sqlLower.startsWith('select')) {
    return parseSelectQuery(sql);
  }
  
  if (sqlLower.startsWith('insert')) {
    return parseInsertQuery(sql);
  }
  
  if (sqlLower.startsWith('update')) {
    return parseUpdateQuery(sql);
  }
  
  if (sqlLower.startsWith('delete')) {
    return parseDeleteQuery(sql);
  }
  
  throw new Error('Unsupported SQL query type');
}

/**
 * Parse SELECT query to REST API call
 * @param {string} sql - SELECT SQL query
 * @returns {Object} REST API request
 */
function parseSelectQuery(sql) {
  // Extract table name
  const fromMatch = sql.match(/from\s+(\w+)/i);
  if (!fromMatch) {
    throw new Error('Could not parse table name from SELECT query');
  }
  
  const tableName = fromMatch[1];
  let path = `/${tableName}`;
  
  // Extract WHERE conditions
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|\s+group\s+by|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    const conditions = parseWhereClause(whereClause);
    if (conditions.length > 0) {
      path += '?' + conditions.join('&');
    }
  }
  
  // Extract ORDER BY
  const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
  if (orderMatch) {
    const column = orderMatch[1];
    const direction = orderMatch[2] || 'asc';
    const separator = path.includes('?') ? '&' : '?';
    path += `${separator}order=${column}.${direction}`;
  }
  
  // Extract LIMIT
  const limitMatch = sql.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    const limit = limitMatch[1];
    const separator = path.includes('?') ? '&' : '?';
    path += `${separator}limit=${limit}`;
  }
  
  return {
    method: 'GET',
    path
  };
}

/**
 * Parse INSERT query to REST API call
 * @param {string} sql - INSERT SQL query
 * @returns {Object} REST API request
 */
function parseInsertQuery(sql) {
  // Extract table name
  const intoMatch = sql.match(/insert\s+into\s+(\w+)/i);
  if (!intoMatch) {
    throw new Error('Could not parse table name from INSERT query');
  }
  
  const tableName = intoMatch[1];
  
  // Extract columns and values
  const valuesMatch = sql.match(/\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
  if (!valuesMatch) {
    throw new Error('Could not parse INSERT values');
  }
  
  const columns = valuesMatch[1].split(',').map(col => col.trim().replace(/["'`]/g, ''));
  const values = valuesMatch[2].split(',').map(val => {
    val = val.trim();
    // Remove quotes and try to parse as number or boolean
    if (val.startsWith("'") || val.startsWith('"')) {
      return val.slice(1, -1);
    }
    if (val === 'true' || val === 'false') {
      return val === 'true';
    }
    if (!isNaN(val)) {
      return Number(val);
    }
    return val;
  });
  
  const body = {};
  columns.forEach((col, index) => {
    body[col] = values[index];
  });
  
  return {
    method: 'POST',
    path: `/${tableName}`,
    body
  };
}

/**
 * Parse UPDATE query to REST API call
 * @param {string} sql - UPDATE SQL query
 * @returns {Object} REST API request
 */
function parseUpdateQuery(sql) {
  // Extract table name
  const tableMatch = sql.match(/update\s+(\w+)/i);
  if (!tableMatch) {
    throw new Error('Could not parse table name from UPDATE query');
  }
  
  const tableName = tableMatch[1];
  
  // Extract SET clause
  const setMatch = sql.match(/set\s+(.+?)\s+where/i);
  if (!setMatch) {
    throw new Error('Could not parse SET clause from UPDATE query');
  }
  
  const setClause = setMatch[1];
  const body = parseSetClause(setClause);
  
  // Extract WHERE conditions
  const whereMatch = sql.match(/where\s+(.+)$/i);
  let path = `/${tableName}`;
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    const conditions = parseWhereClause(whereClause);
    if (conditions.length > 0) {
      path += '?' + conditions.join('&');
    }
  }
  
  return {
    method: 'PATCH',
    path,
    body
  };
}

/**
 * Parse DELETE query to REST API call
 * @param {string} sql - DELETE SQL query
 * @returns {Object} REST API request
 */
function parseDeleteQuery(sql) {
  // Extract table name
  const fromMatch = sql.match(/delete\s+from\s+(\w+)/i);
  if (!fromMatch) {
    throw new Error('Could not parse table name from DELETE query');
  }
  
  const tableName = fromMatch[1];
  
  // Extract WHERE conditions
  const whereMatch = sql.match(/where\s+(.+)$/i);
  let path = `/${tableName}`;
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    const conditions = parseWhereClause(whereClause);
    if (conditions.length > 0) {
      path += '?' + conditions.join('&');
    }
  }
  
  return {
    method: 'DELETE',
    path
  };
}

/**
 * Parse WHERE clause to PostgREST query parameters
 * @param {string} whereClause - WHERE clause
 * @returns {Array} Query parameters
 */
function parseWhereClause(whereClause) {
  const conditions = [];
  
  // Split by AND (simple implementation)
  const parts = whereClause.split(/\s+and\s+/i);
  
  parts.forEach(part => {
    part = part.trim();
    
    // Handle different operators
    if (part.includes('=')) {
      const [column, value] = part.split('=').map(s => s.trim());
      const cleanValue = value.replace(/["']/g, '');
      conditions.push(`${column}=eq.${cleanValue}`);
    } else if (part.includes('!=') || part.includes('<>')) {
      const [column, value] = part.split(/!=|<>/).map(s => s.trim());
      const cleanValue = value.replace(/["']/g, '');
      conditions.push(`${column}=neq.${cleanValue}`);
    } else if (part.includes('>=')) {
      const [column, value] = part.split('>=').map(s => s.trim());
      const cleanValue = value.replace(/["']/g, '');
      conditions.push(`${column}=gte.${cleanValue}`);
    } else if (part.includes('<=')) {
      const [column, value] = part.split('<=').map(s => s.trim());
      const cleanValue = value.replace(/["']/g, '');
      conditions.push(`${column}=lte.${cleanValue}`);
    } else if (part.includes('>')) {
      const [column, value] = part.split('>').map(s => s.trim());
      const cleanValue = value.replace(/["']/g, '');
      conditions.push(`${column}=gt.${cleanValue}`);
    } else if (part.includes('<')) {
      const [column, value] = part.split('<').map(s => s.trim());
      const cleanValue = value.replace(/["']/g, '');
      conditions.push(`${column}=lt.${cleanValue}`);
    } else if (part.includes(' LIKE ')) {
      const [column, value] = part.split(/\s+like\s+/i).map(s => s.trim());
      const cleanValue = value.replace(/["'%]/g, '');
      conditions.push(`${column}=like.*${cleanValue}*`);
    } else if (part.includes(' IN ')) {
      const [column, valueList] = part.split(/\s+in\s+/i).map(s => s.trim());
      const values = valueList.replace(/[()"']/g, '').split(',').map(v => v.trim());
      conditions.push(`${column}=in.(${values.join(',')})`);
    }
  });
  
  return conditions;
}

/**
 * Parse SET clause to update object
 * @param {string} setClause - SET clause
 * @returns {Object} Update object
 */
function parseSetClause(setClause) {
  const updates = {};
  
  const assignments = setClause.split(',');
  assignments.forEach(assignment => {
    const [column, value] = assignment.split('=').map(s => s.trim());
    let cleanValue = value.replace(/["']/g, '');
    
    // Try to parse as number or boolean
    if (cleanValue === 'true' || cleanValue === 'false') {
      cleanValue = cleanValue === 'true';
    } else if (!isNaN(cleanValue)) {
      cleanValue = Number(cleanValue);
    }
    
    updates[column] = cleanValue;
  });
  
  return updates;
}

/**
 * Get authentication token for API requests
 * @returns {string|null} Auth token
 */
function getAuthToken() {
  // Get token from localStorage or context
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      return parsed.access_token;
    } catch (error) {
      console.error('Failed to parse auth token:', error);
    }
  }
  return null;
}

/**
 * Set authentication token for API requests
 * @param {string} token - Auth token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: token }));
  } else {
    localStorage.removeItem('supabase.auth.token');
  }
}

/**
 * Clear authentication token
 */
export function clearAuthToken() {
  localStorage.removeItem('supabase.auth.token');
}

// ==================== BROWSER AUTOMATION HELPERS ====================

/**
 * Get active Chrome tab
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Active tab info
 */
async function getActiveTab(baseUrl) {
  const response = await fetchWithRetry(`${baseUrl}/json`);
  const tabs = await response.json();
  
  // Find the first active tab or create a new one
  let activeTab = tabs.find(tab => tab.type === 'page' && !tab.url.startsWith('chrome-extension://'));
  
  if (!activeTab && tabs.length > 0) {
    activeTab = tabs[0];
  }
  
  if (!activeTab) {
    throw new Error('No active Chrome tab found');
  }
  
  return activeTab;
}

/**
 * Send command to Chrome DevTools Protocol
 * @param {Object} tab - Chrome tab info
 * @param {string} method - CDP method
 * @param {Object} params - CDP parameters
 * @returns {Promise<any>} CDP response
 */
async function sendCDPCommand(tab, method, params = {}) {
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  
  return new Promise((resolve, reject) => {
    const commandId = Date.now();
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: commandId,
        method,
        params
      }));
    };
    
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.id === commandId) {
        ws.close();
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      }
    };
    
    ws.onerror = (error) => {
      ws.close();
      reject(error);
    };
    
    setTimeout(() => {
      ws.close();
      reject(new Error('CDP command timeout'));
    }, 10000);
  });
}

/**
 * Navigate to URL
 * @param {string} url - Target URL
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Navigation result
 */
async function navigateToUrl(url, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Page.navigate', { url });
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    url,
    frameId: result.frameId
  };
}

/**
 * Take screenshot
 * @param {Object} args - Screenshot arguments
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Screenshot result
 */
async function takeScreenshot(args, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const params = {
    format: args.format || 'png',
    quality: args.quality || 90
  };
  
  if (args.selector) {
    // Screenshot of specific element
    const element = await sendCDPCommand(tab, 'Runtime.evaluate', {
      expression: `document.querySelector('${args.selector}').getBoundingClientRect()`
    });
    
    if (element.result.value) {
      const rect = element.result.value;
      params.clip = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        scale: 1
      };
    }
  }
  
  const result = await sendCDPCommand(tab, 'Page.captureScreenshot', params);
  
  return {
    success: true,
    name: args.name || 'screenshot',
    data: result.data,
    format: params.format
  };
}

/**
 * Get console logs
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Array>} Console logs
 */
async function getConsoleLogs(baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  // Enable runtime domain
  await sendCDPCommand(tab, 'Runtime.enable');
  
  // Get console API calls
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: `
      (function() {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = function(...args) {
          logs.push({ level: 'log', message: args.join(' '), timestamp: Date.now() });
          originalLog.apply(console, args);
        };
        
        console.error = function(...args) {
          logs.push({ level: 'error', message: args.join(' '), timestamp: Date.now() });
          originalError.apply(console, args);
        };
        
        console.warn = function(...args) {
          logs.push({ level: 'warn', message: args.join(' '), timestamp: Date.now() });
          originalWarn.apply(console, args);
        };
        
        return window.consoleLogs || [];
      })()
    `
  });
  
  return result.result.value || [];
}

/**
 * Click element
 * @param {string} selector - CSS selector
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Click result
 */
async function clickElement(selector, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: `
      (function() {
        const element = document.querySelector('${selector}');
        if (!element) {
          return { success: false, error: 'Element not found' };
        }
        element.click();
        return { success: true, selector: '${selector}' };
      })()
    `
  });
  
  return result.result.value;
}

/**
 * Type in element
 * @param {string} selector - CSS selector
 * @param {string} value - Text to type
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Type result
 */
async function typeInElement(selector, value, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: `
      (function() {
        const element = document.querySelector('${selector}');
        if (!element) {
          return { success: false, error: 'Element not found' };
        }
        element.focus();
        element.value = '${value}';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, selector: '${selector}', value: '${value}' };
      })()
    `
  });
  
  return result.result.value;
}

/**
 * Evaluate JavaScript
 * @param {string} script - JavaScript code
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<any>} Evaluation result
 */
async function evaluateJavaScript(script, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: script,
    returnByValue: true
  });
  
  return result.result.value;
}

/**
 * Get network logs
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Array>} Network logs
 */
async function getNetworkLogs(baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  // Enable network domain
  await sendCDPCommand(tab, 'Network.enable');
  
  // This is a simplified implementation
  // In a real scenario, you'd need to listen to network events
  return {
    success: true,
    message: 'Network logging enabled. Use Chrome DevTools to view detailed network logs.'
  };
}

/**
 * Hover over element
 * @param {string} selector - CSS selector
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Hover result
 */
async function hoverElement(selector, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: `
      (function() {
        const element = document.querySelector('${selector}');
        if (!element) {
          return { success: false, error: 'Element not found' };
        }
        const event = new MouseEvent('mouseover', { bubbles: true });
        element.dispatchEvent(event);
        return { success: true, selector: '${selector}' };
      })()
    `
  });
  
  return result.result.value;
}

/**
 * Select option
 * @param {string} selector - CSS selector
 * @param {string} value - Option value
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Select result
 */
async function selectOption(selector, value, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: `
      (function() {
        const element = document.querySelector('${selector}');
        if (!element) {
          return { success: false, error: 'Element not found' };
        }
        element.value = '${value}';
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, selector: '${selector}', value: '${value}' };
      })()
    `
  });
  
  return result.result.value;
}

/**
 * Wait for element
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Wait result
 */
async function waitForElement(selector, timeout, baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
      expression: `document.querySelector('${selector}') !== null`
    });
    
    if (result.result.value) {
      return { success: true, selector, found: true };
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { success: false, selector, error: 'Element not found within timeout' };
}

/**
 * Get page info
 * @param {string} baseUrl - Chrome debugging base URL
 * @returns {Promise<Object>} Page information
 */
async function getPageInfo(baseUrl) {
  const tab = await getActiveTab(baseUrl);
  
  const result = await sendCDPCommand(tab, 'Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      })
    `,
    returnByValue: true
  });
  
  return result.result.value;
}

export default {
  run_mcp,
  setAuthToken,
  clearAuthToken
};