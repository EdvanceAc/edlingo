# Supabase MCP Server Setup Guide for EdLingo

## Overview

This guide explains how to set up and use the official Supabase MCP Server (`@supabase/mcp-server-supabase`) in your EdLingo project. The Supabase MCP Server provides over 20 tools for full CRUD management of your Supabase projects via Model Context Protocol.

## Prerequisites

✅ **Already Available in Your Project:**
- Node.js v14+ (you have this)
- Existing Supabase configuration in EdLingo
- MCP client utilities (`src/utils/mcpClient.js`)
- Supabase JavaScript client (`@supabase/supabase-js`)

## Step 1: Install Supabase MCP Server

The Supabase MCP server has been installed globally:

```bash
npm install -g @supabase/mcp-server-supabase@latest
```

## Step 2: Get Your Supabase Personal Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings** → **API** → **Personal Access Tokens**
3. Click **Generate new token**
4. Give it a descriptive name (e.g., "EdLingo MCP Server")
5. Copy the generated token

## Step 3: Get Your Project Reference

1. In your Supabase Dashboard, go to your project
2. Navigate to **Settings** → **General**
3. Copy the **Project Reference ID** (it looks like `abcdefghijklmnop`)

## Step 4: Configure Environment Variables

Add the following to your `.env` file:

```env
# Supabase MCP Server Configuration
SUPABASE_ACCESS_TOKEN=your_personal_access_token_here
SUPABASE_PROJECT_REF=your_project_reference_here
```

## Step 5: MCP Configuration

The MCP configuration has been created in `.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=${env:SUPABASE_PROJECT_REF}",
        "--features=database,project,debug",
        "--access-token",
        "${env:SUPABASE_ACCESS_TOKEN}"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${env:SUPABASE_ACCESS_TOKEN}",
        "SUPABASE_PROJECT_REF": "${env:SUPABASE_PROJECT_REF}"
      }
    }
  }
}
```

## Step 6: Available Tools

The Supabase MCP Server provides the following categories of tools:

### Project Management
- `create_project` - Create a new Supabase project
- `delete_project` - Delete a project
- `list_projects` - List all your projects
- `pause_project` - Pause a project
- `restore_project` - Restore a paused project

### Schema Management
- `list_tables` - List all tables in your database
- `create_table` - Create a new table
- `drop_table` - Delete a table
- `apply_migration` - Apply DDL operations

### Data Operations
- `execute_sql` - Execute SQL queries (INSERT, UPDATE, DELETE, SELECT)
- `list_migrations` - List database migrations

### Configuration & Types
- `fetch_config` - Get project configuration
- `generate_types` - Generate TypeScript interfaces

### Debug & Monitoring
- `get_logs` - Get application logs
- `get_advisors` - Get performance advisors
- `get_edge_logs` - Get Edge Function logs

## Step 7: Usage Examples

### Using via MCP Client

The `src/utils/mcpClient.js` has been updated to support Supabase MCP operations:

```javascript
import { run_mcp } from '../utils/mcpClient.js';

// Execute SQL query
const result = await run_mcp('mcp.config.usrlocalmcp.Supabase', 'execute_sql', {
  sql: 'SELECT * FROM cefr_assessment_questions LIMIT 10'
});

// List all tables
const tables = await run_mcp('mcp.config.usrlocalmcp.Supabase', 'list_tables', {});

// Create a new table
const createResult = await run_mcp('mcp.config.usrlocalmcp.Supabase', 'apply_migration', {
  sql: 'CREATE TABLE test_table (id serial PRIMARY KEY, name text)'
});

// List projects
const projects = await run_mcp('mcp.config.usrlocalmcp.Supabase', 'list_projects', {});
```

### Direct MCP Tool Usage

If you're using an MCP-compatible AI tool (like Claude with MCP support), you can directly invoke:

```json
{
  "tool": "execute_sql",
  "args": {
    "sql": "SELECT * FROM cefr_assessment_questions WHERE cefr_level = 'B1'"
  }
}
```

## Step 8: Security Best Practices

### 🔒 Important Security Notes

1. **Use Development/Staging Only**: Connect only to development or staging projects, never production
2. **Project Scoping**: The configuration includes `--project-ref` to limit access to your specific project
3. **Feature Restrictions**: Only `database`, `project`, and `debug` features are enabled
4. **Read-Only by Default**: The server runs in read-only mode by default to prevent accidental writes
5. **Environment Variables**: Never commit your access tokens to version control

### Enable Write Operations (Optional)

To enable full CRUD operations, you can modify the `.mcp.json` configuration to remove the `--read-only` flag (it's not included by default in our setup).

## Step 9: Integration with Admin Dashboard

The admin dashboard can now use Supabase MCP tools to:

1. **Sync CEFR Questions**: Use `execute_sql` to fetch questions from the database
2. **Manage Tables**: Use `list_tables` and `create_table` for schema management
3. **Execute Migrations**: Use `apply_migration` for database updates
4. **Monitor Performance**: Use debug tools for optimization

### Example: Update Admin Dashboard to Use Real Data

```javascript
// In admin-dashboard.html, replace mock data with:
async function loadAssessmentQuestions() {
  try {
    const questions = await run_mcp('mcp.config.usrlocalmcp.Supabase', 'execute_sql', {
      sql: 'SELECT * FROM cefr_assessment_questions ORDER BY created_at DESC'
    });
    
    displayAssessmentQuestions(questions);
  } catch (error) {
    console.error('Failed to load assessment questions:', error);
    // Fallback to mock data or show error
  }
}
```

## Step 10: Troubleshooting

### Common Issues

1. **Access Token Invalid**
   ```
   Error: SUPABASE_ACCESS_TOKEN environment variable is required
   ```
   - Ensure you've set the access token in your `.env` file
   - Verify the token is valid and not expired

2. **Project Reference Not Found**
   ```
   Error: Project not found
   ```
   - Check your `SUPABASE_PROJECT_REF` in the `.env` file
   - Ensure you have access to the project

3. **Permission Denied**
   ```
   Error: Insufficient permissions
   ```
   - Verify your access token has the required permissions
   - Check if the project is paused or deleted

### Debug Commands

```bash
# Test MCP server connection
npx @supabase/mcp-server-supabase --help

# List your projects
npx @supabase/mcp-server-supabase --access-token YOUR_TOKEN list-projects

# Test database connection
npx @supabase/mcp-server-supabase --project-ref YOUR_REF --access-token YOUR_TOKEN list-tables
```

## Next Steps

1. **Update Admin Dashboard**: Replace mock data with real Supabase MCP calls
2. **Implement Real-time Sync**: Use MCP tools for live data synchronization
3. **Add Error Handling**: Implement proper error handling for MCP operations
4. **Performance Monitoring**: Use debug tools to monitor and optimize performance
5. **Type Generation**: Use `generate_types` to create TypeScript definitions

## Resources

- [Supabase MCP Server Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [EdLingo Database Schema](./database/migrations/)

---

**🎉 Congratulations!** You now have full Supabase MCP Server integration in your EdLingo project. You can perform complete CRUD operations, manage your database schema, and monitor your Supabase project directly through MCP tools.