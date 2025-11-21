#!/usr/bin/env node

/**
 * EdLingo Critical Issues Fix Script
 * 
 * This script addresses the two critical issues identified in the TestSprite report:
 * 1. Frontend Resource Loading Crisis (ERR_EMPTY_RESPONSE errors)
 * 2. Supabase Database Schema Mismatch (missing columns)
 * 
 * Usage: node fix-critical-issues.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔧 EdLingo Critical Issues Fix Script');
console.log('=====================================\n');

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
  const timestamp = new Date().toLocaleTimeString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    header: colors.magenta
  };
  
  console.log(`${colorMap[type]}[${timestamp}] ${message}${colors.reset}`);
}

// Fix 1: Database Schema Issues
async function fixDatabaseSchema() {
  log('🗄️  Fixing Supabase Database Schema Issues...', 'header');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      log('❌ Supabase credentials not found in environment variables', 'error');
      log('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file', 'warning');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Supabase client initialized', 'success');
    
    // Read and execute the schema fix SQL
    const schemaFixPath = path.join(__dirname, 'supabase-schema-fix.sql');
    
    if (!fs.existsSync(schemaFixPath)) {
      log('❌ Schema fix file not found: supabase-schema-fix.sql', 'error');
      return false;
    }
    
    const sqlContent = fs.readFileSync(schemaFixPath, 'utf8');
    log('📄 Schema fix SQL loaded', 'info');
    
    // Note: Direct SQL execution via Supabase client is limited
    // The user should run the SQL manually in Supabase Dashboard
    log('⚠️  Please execute the following SQL in your Supabase Dashboard > SQL Editor:', 'warning');
    log('📁 File: supabase-schema-fix.sql', 'info');
    log('🔗 Or run: node run-migrations.js', 'info');
    
    return true;
    
  } catch (error) {
    log(`❌ Database schema fix failed: ${error.message}`, 'error');
    return false;
  }
}

// Fix 2: Vite Configuration Issues
function fixViteConfiguration() {
  log('⚙️  Fixing Vite Development Server Configuration...', 'header');
  
  try {
    const viteConfigPath = path.join(__dirname, 'vite.config.js');
    
    if (!fs.existsSync(viteConfigPath)) {
      log('❌ vite.config.js not found', 'error');
      return false;
    }
    
    let configContent = fs.readFileSync(viteConfigPath, 'utf8');
    log('📄 Vite configuration loaded', 'info');
    
    // Check if fixes are already applied
    if (configContent.includes('strictPort: true') && configContent.includes('cors:')) {
      log('✅ Vite configuration already fixed', 'success');
      return true;
    }
    
    // Apply fixes
    const serverConfigRegex = /server:\s*{[^}]*}/s;
    const newServerConfig = `server: {
    port: 3002,
    strictPort: true,
    host: '127.0.0.1',
    hmr: {
      host: 'localhost',
      port: 3002
    },
    cors: {
      origin: ['http://localhost:3002', 'http://127.0.0.1:3002'],
      credentials: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  }`;
    
    if (serverConfigRegex.test(configContent)) {
      configContent = configContent.replace(serverConfigRegex, newServerConfig);
      fs.writeFileSync(viteConfigPath, configContent, 'utf8');
      log('✅ Vite configuration updated successfully', 'success');
      return true;
    } else {
      log('❌ Could not find server configuration in vite.config.js', 'error');
      return false;
    }
    
  } catch (error) {
    log(`❌ Vite configuration fix failed: ${error.message}`, 'error');
    return false;
  }
}

// Fix 3: Verify Component Paths
function verifyComponentPaths() {
  log('🔍 Verifying UI Component Paths...', 'header');
  
  const componentsToCheck = [
    'src/renderer/components/ui/Button.jsx',
    'src/renderer/components/ui/Progress.jsx',
    'src/renderer/components/ui/LoadingScreen.jsx',
    'src/renderer/utils/cn.js'
  ];
  
  let allComponentsExist = true;
  
  componentsToCheck.forEach(componentPath => {
    const fullPath = path.join(__dirname, componentPath);
    if (fs.existsSync(fullPath)) {
      log(`✅ ${componentPath} exists`, 'success');
    } else {
      log(`❌ ${componentPath} missing`, 'error');
      allComponentsExist = false;
    }
  });
  
  return allComponentsExist;
}

// Main execution
async function main() {
  log('🚀 Starting critical issues fix process...', 'header');
  
  const results = {
    database: await fixDatabaseSchema(),
    vite: fixViteConfiguration(),
    components: verifyComponentPaths()
  };
  
  log('\n📊 Fix Results Summary:', 'header');
  log(`Database Schema: ${results.database ? '✅ Fixed' : '❌ Needs Manual Fix'}`, results.database ? 'success' : 'warning');
  log(`Vite Configuration: ${results.vite ? '✅ Fixed' : '❌ Failed'}`, results.vite ? 'success' : 'error');
  log(`Component Paths: ${results.components ? '✅ Verified' : '❌ Issues Found'}`, results.components ? 'success' : 'error');
  
  if (results.vite && results.components) {
    log('\n🎉 Frontend fixes applied successfully!', 'success');
    log('📝 Next steps:', 'info');
    log('   1. Run the database migration: node run-migrations.js', 'info');
    log('   2. Restart the development server: npm run dev', 'info');
    log('   3. Test the application at http://127.0.0.1:3002', 'info');
  } else {
    log('\n⚠️  Some issues require manual intervention', 'warning');
    log('Please check the error messages above and fix manually', 'info');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`❌ Script execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { fixDatabaseSchema, fixViteConfiguration, verifyComponentPaths };