#!/usr/bin/env node

/**
 * Deployment script for Supabase Edge Function
 * This script helps deploy the process-gemini-chat Edge Function
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Deploying Supabase Edge Function: process-gemini-chat');

// Check if Supabase CLI is available via npx
try {
  execSync('npx supabase --version', { stdio: 'pipe' });
  console.log('✅ Supabase CLI found via npx');
} catch (error) {
  console.error('❌ Supabase CLI not available. Installing via npx...');
  try {
    execSync('npx supabase --version', { stdio: 'inherit' });
  } catch (installError) {
    console.error('❌ Failed to install Supabase CLI');
    process.exit(1);
}
}

// Check if function directory exists
const functionPath = path.join(__dirname, 'supabase', 'functions', 'process-gemini-chat');
if (!fs.existsSync(functionPath)) {
  console.error('❌ Edge Function directory not found:', functionPath);
  process.exit(1);
}

console.log('📁 Function directory found:', functionPath);

try {
  // Deploy the Edge Function
  console.log('🔄 Deploying Edge Function...');
  execSync('npx supabase functions deploy process-gemini-chat', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('✅ Edge Function deployed successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Set your GEMINI_API_KEY in Supabase Dashboard > Edge Functions > Secrets');
  console.log('2. Test the function with your application');
  console.log('3. Monitor function logs in the Supabase Dashboard');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('1. Make sure you\'re logged in: npx supabase login');
  console.error('2. Link your project: npx supabase link --project-ref YOUR_PROJECT_REF');
  console.error('3. Check your internet connection');
  process.exit(1);
}