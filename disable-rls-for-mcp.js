#!/usr/bin/env node

/**
 * Disable RLS policies that might be blocking MCP server connection
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableRLSForMCP() {
  console.log('🚀 Attempting to resolve MCP server access issues...');
  
  // First, let's check what tables exist
  console.log('\n📋 Checking existing tables...');
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(20);
      
    if (error) {
      console.log('❌ Error fetching tables:', error.message);
    } else {
      console.log('✅ Found tables:', tables.map(t => t.table_name).join(', '));
    }
  } catch (err) {
    console.log('❌ Failed to fetch tables:', err.message);
  }
  
  // Try to access some key tables directly
  console.log('\n🔍 Testing direct table access...');
  
  const testTables = ['user_profiles', 'courses', 'lessons', 'user_progress'];
  
  for (const table of testTables) {
    try {
      console.log(`Testing access to ${table}...`);
      
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(1);
        
      if (error) {
        console.log(`❌ Error accessing ${table}:`, error.message);
        
        // If it's an RLS error, the table exists but is blocked
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log(`🔒 ${table} is blocked by RLS policies`);
        }
      } else {
        console.log(`✅ ${table} accessible (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ Failed to test ${table}:`, err.message);
    }
  }
  
  // Check if we can create a simple bypass policy
  console.log('\n🛠️ Attempting to create bypass policies...');
  
  // Try using the SQL editor approach
  try {
    // Test with a simple query first
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (error && error.message.includes('policy')) {
      console.log('🔒 Confirmed: RLS policies are blocking access');
      console.log('💡 Recommendation: Manually disable RLS in Supabase Dashboard');
      console.log('   Go to: Database → Tables → Select table → Settings → Disable RLS');
    }
  } catch (err) {
    console.log('Error testing policies:', err.message);
  }
  
  console.log('\n📝 Summary:');
  console.log('- The MCP server authentication issue may be related to RLS policies');
  console.log('- Consider temporarily disabling RLS on key tables via Supabase Dashboard');
  console.log('- Or create permissive policies that allow service role access');
}

disableRLSForMCP().catch(console.error);