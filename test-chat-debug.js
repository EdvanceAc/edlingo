// Test script to check chat functionality
const { app, BrowserWindow } = require('electron');

// Simple test to check if the app is running and accessible
console.log('🔍 Testing chat functionality...');
console.log('📍 App should be running at: http://localhost:3003/supabase-gemini-test');
console.log('🎯 Please manually test by:');
console.log('   1. Navigate to http://localhost:3003/supabase-gemini-test');
console.log('   2. Enter a test message like "Hello, how are you?"');
console.log('   3. Click "Send Message"');
console.log('   4. Check the terminal for debug logs starting with 🧪');
console.log('   5. Check browser console (F12) for any errors');
console.log('');
console.log('Expected debug logs should appear in this order:');
console.log('   🧪 SupabaseGeminiTest: Starting message send');
console.log('   🧪 SupabaseGeminiTest: Calling supabaseGeminiService.sendMessage');
console.log('   📤 SupabaseGeminiService: sendMessage called');
console.log('   📤 SupabaseGeminiService: Using non-streaming mode');
console.log('   🧪 SupabaseGeminiTest: Received result');
console.log('   🧪 SupabaseGeminiTest: Message send completed');