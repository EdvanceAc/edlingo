#!/usr/bin/env node

/**
 * Print LocalStorage setter commands from .env file
 * 
 * This utility reads environment variables from the project .env file
 * and generates JavaScript commands that can be copy-pasted into the browser
 * DevTools console to populate localStorage for localhost development.
 */

const fs = require('fs');
const path = require('path');

// Load dotenv to read .env file
try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    console.log('✅ Loaded .env from project root\n');
} catch (e) {
    console.error('❌ Could not load .env file:', e.message);
    console.log('Make sure you have a .env file in the project root with your Supabase credentials.');
    process.exit(1);
}

// Environment variables that the admin dashboard needs
const REQUIRED_VARS = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_SERVICE_ROLE_KEY'
];

const OPTIONAL_VARS = [
    'VITE_GOOGLE_GEMINI_API_KEY',
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_GOOGLE_CLIENT_SECRET'
];

function printLocalStorageCommands() {
    console.log('🔑 LocalStorage Commands for Development\n');
    console.log('Copy and paste these commands into your browser DevTools console:');
    console.log('(Open DevTools → Console tab → paste commands → press Enter)\n');
    
    let hasRequired = true;
    const commands = [];
    
    // Check required variables
    console.log('📋 Required Variables:');
    REQUIRED_VARS.forEach(key => {
        const value = process.env[key];
        if (value) {
            console.log(`✅ ${key}: Found`);
            commands.push(`localStorage.setItem('${key}', '${value}');`);
        } else {
            console.log(`❌ ${key}: Missing`);
            hasRequired = false;
        }
    });
    
    // Check optional variables
    console.log('\n🔧 Optional Variables:');
    OPTIONAL_VARS.forEach(key => {
        const value = process.env[key];
        if (value) {
            console.log(`✅ ${key}: Found`);
            commands.push(`localStorage.setItem('${key}', '${value}');`);
        } else {
            console.log(`ℹ️  ${key}: Not set (optional)`);
        }
    });
    
    if (!hasRequired) {
        console.log('\n❌ Some required environment variables are missing.');
        console.log('Please add them to your .env file before proceeding.');
        console.log('\nExample .env file:');
        console.log('VITE_SUPABASE_URL=https://your-project-id.supabase.co');
        console.log('VITE_SUPABASE_ANON_KEY=your-anon-key-here');
        console.log('VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
        return;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 COPY THESE COMMANDS TO BROWSER CONSOLE:');
    console.log('='.repeat(80));
    
    commands.forEach(cmd => {
        console.log(cmd);
    });
    
    console.log('console.log("✅ localStorage populated for development");');
    
    console.log('='.repeat(80));
    console.log('\n📝 After running these commands:');
    console.log('1. Refresh the admin dashboard page');
    console.log('2. Check the browser console for "🏠 Using localStorage for localhost development"');
    console.log('3. Verify no errors about missing Supabase credentials');
    
    console.log('\n🔄 To clear localStorage later (if needed):');
    console.log('localStorage.clear(); // Clears all localStorage data');
}

// Export for programmatic use
module.exports = { printLocalStorageCommands, REQUIRED_VARS, OPTIONAL_VARS };

// Run if called directly
if (require.main === module) {
    printLocalStorageCommands();
}