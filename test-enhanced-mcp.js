#!/usr/bin/env node

// Test script for Enhanced MCP Client
require('dotenv').config();

// Set environment variables for the MCP client
process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Missing');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
console.log('');

// Import and test the enhanced MCP client
import('./src/utils/enhancedMcpClient.js')
  .then(({ mcpSQL }) => {
    console.log('🧪 Testing Enhanced MCP Client...');
    
    return mcpSQL.test();
  })
  .then(result => {
    console.log('\n📊 Test Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ MCP Client is working!');
      
      // Test listing tables if connectivity works
      return import('./src/utils/enhancedMcpClient.js')
        .then(({ mcpSQL }) => mcpSQL.listTables());
    } else {
      console.log('\n❌ MCP Client connectivity failed');
      return null;
    }
  })
  .then(tablesResult => {
    if (tablesResult) {
      console.log('\n📋 Tables Result:');
      console.log(JSON.stringify(tablesResult, null, 2));
    }
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  });