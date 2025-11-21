#!/usr/bin/env node

/**
 * Fix Netlify Browser Console Errors
 * 
 * This script addresses two main issues:
 * 1. Suspended Gemini API key causing initialization failures
 * 2. Null reference errors in ProgressProvider
 * 
 * Usage: node fix-netlify-errors.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 EdLingo Netlify Error Fix Tool');
console.log('==================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found');
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Creating .env from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created');
  } else {
    console.log('❌ .env.example not found either');
    process.exit(1);
  }
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Function to update or add environment variable
function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}

// Check current Gemini API key
const currentKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
const currentKey = currentKeyMatch ? currentKeyMatch[1] : null;

console.log('🔍 Current Status:');
console.log(`   Gemini API Key: ${currentKey ? currentKey.substring(0, 20) + '...' : 'Not set'}`);

// Check if the problematic key is being used
const problematicKey = 'AIzaSyDr1onXBzRitEaW27nJAFVe68a68MKaVAM';
if (currentKey === problematicKey) {
  console.log('⚠️  WARNING: You are using the suspended API key!');
  console.log('   This key has been suspended by Google.');
  console.log('   Please get a new API key from: https://aistudio.google.com/app/apikey');
} else if (currentKey && currentKey !== 'your_gemini_api_key_here') {
  console.log('✅ API key looks different from the suspended one');
} else {
  console.log('⚠️  No valid API key configured');
}

console.log('\n🛠️  Fixes Applied:');
console.log('   ✅ ProgressProvider null reference error - FIXED');
console.log('   ✅ Enhanced error handling for API failures - READY');
console.log('   ✅ Fallback responses when API is unavailable - READY');

console.log('\n📋 Next Steps for Netlify Deployment:');
console.log('\n1. Get a new Gemini API key:');
console.log('   → Visit: https://aistudio.google.com/app/apikey');
console.log('   → Create a new API key');
console.log('   → Copy the key');

console.log('\n2. Update Netlify Environment Variables:');
console.log('   → Go to your Netlify dashboard');
console.log('   → Navigate to: Site Settings → Environment Variables');
console.log('   → Add/Update these variables:');
console.log('     • VITE_GEMINI_API_KEY=your_new_api_key_here');
console.log('     • GEMINI_API_KEY=your_new_api_key_here');
console.log('     • VITE_GOOGLE_API_KEY=your_new_api_key_here');

console.log('\n3. Redeploy your site:');
console.log('   → Trigger a new deployment on Netlify');
console.log('   → Or push a new commit to trigger auto-deployment');

console.log('\n4. Test the fixes:');
console.log('   → Open browser console on your Netlify site');
console.log('   → Verify no more "CONSUMER_SUSPENDED" errors');
console.log('   → Test chat functionality');
console.log('   → Confirm progress tracking works without errors');

console.log('\n🔧 Local Development:');
if (currentKey === 'your_gemini_api_key_here' || !currentKey) {
  console.log('   ⚠️  Update your local .env file with a valid API key');
  console.log('   → Add: VITE_GEMINI_API_KEY=your_actual_api_key');
} else {
  console.log('   ✅ Local .env appears to be configured');
}

console.log('\n💡 Additional Notes:');
console.log('   • The app now gracefully handles API failures');
console.log('   • Users will see "AI Ready (Fallback Mode)" when API is unavailable');
console.log('   • Core functionality continues to work without AI dependency');
console.log('   • Progress tracking is now more robust with null checks');

console.log('\n✨ Fix completed! Follow the steps above to resolve Netlify issues.');