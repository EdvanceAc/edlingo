/**
 * Direct Gemini API Test Script
 * This script tests the Gemini API directly to help diagnose API key issues
 * Run with: node test-gemini-direct.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class GeminiTester {
    constructor() {
        this.apiKey = null;
        this.genAI = null;
        this.model = null;
    }

    /**
     * Test with environment variable API key
     */
    async testWithEnvKey() {
        console.log('\n=== Testing with Environment Variable API Key ===');
        
        // Try different environment variable names
        const envKeys = [
            'VITE_GEMINI_API_KEY',
            'VITE_GOOGLE_GEMINI_API_KEY',
            'GEMINI_API_KEY',
            'GOOGLE_GEMINI_API_KEY'
        ];

        for (const envKey of envKeys) {
            const key = process.env[envKey];
            if (key) {
                console.log(`Found API key in ${envKey}: ${key.substring(0, 20)}...`);
                await this.testApiKey(key, `Environment Variable (${envKey})`);
                return;
            }
        }

        console.log('❌ No API key found in environment variables');
        console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE')));
    }

    /**
     * Test a specific API key
     */
    async testApiKey(apiKey, source = 'Manual') {
        console.log(`\n--- Testing API Key from ${source} ---`);
        console.log(`Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}`);

        try {
            // Initialize the Generative AI client
            this.genAI = new GoogleGenerativeAI(apiKey);
            // Try different model names that might be available
            const modelNames = ['gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-pro'];
            let modelInitialized = false;
            
            for (const modelName of modelNames) {
                try {
                    console.log(`Trying model: ${modelName}`);
                    this.model = this.genAI.getGenerativeModel({ 
                        model: modelName,
                        generationConfig: {
                            maxOutputTokens: 200,
                            temperature: 0.7,
                        }
                    });
                    modelInitialized = true;
                    console.log(`✅ Model ${modelName} initialized successfully`);
                    break;
                } catch (error) {
                    console.log(`❌ Model ${modelName} failed: ${error.message}`);
                }
            }
            
            if (!modelInitialized) {
                 throw new Error('No supported model found');
             }

            console.log('✅ Model initialized successfully');

            // Test with a simple prompt
            const prompt = "Hello! Please respond with a simple greeting in English.";
            console.log(`Sending prompt: "${prompt}"`);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log('✅ API call successful!');
            console.log('Response:', text);
            console.log('Response length:', text.length);

            return { success: true, response: text };

        } catch (error) {
            console.log('❌ API call failed');
            console.log('Error type:', error.constructor.name);
            console.log('Error message:', error.message);
            
            if (error.message.includes('suspended')) {
                console.log('🚨 API KEY IS SUSPENDED - You need a new API key');
            } else if (error.message.includes('403')) {
                console.log('🚨 Permission denied - Check API key validity');
            } else if (error.message.includes('quota')) {
                console.log('🚨 Quota exceeded - Check your usage limits');
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Test the Supabase Edge Function
     */
    async testSupabaseEdgeFunction() {
        console.log('\n=== Testing Supabase Edge Function ===');
        
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
            console.log('❌ Missing Supabase credentials');
            console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
            console.log('VITE_SUPABASE_ANON_KEY:', anonKey ? 'Found' : 'Missing');
            return;
        }

        const functionUrl = `${supabaseUrl}/functions/v1/process-gemini-chat`;
        console.log('Function URL:', functionUrl);

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Hello! Please respond with a simple greeting.',
                    focusArea: 'general',
                    userLevel: 'beginner',
                    streaming: false
                })
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Edge Function call successful!');
                console.log('Response data:', data);
            } else {
                const errorText = await response.text();
                console.log('❌ Edge Function call failed');
                console.log('Error response:', errorText);
            }

        } catch (error) {
            console.log('❌ Edge Function call failed');
            console.log('Error:', error.message);
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Gemini API Tests...');
        console.log('Time:', new Date().toISOString());
        
        // Test 1: Environment variable key
        await this.testWithEnvKey();
        
        // Test 2: Supabase Edge Function
        await this.testSupabaseEdgeFunction();
        
        console.log('\n=== Test Summary ===');
        console.log('If you see "API KEY IS SUSPENDED", you need to:');
        console.log('1. Go to https://aistudio.google.com/app/apikey');
        console.log('2. Create a new API key');
        console.log('3. Update your .env file with the new key');
        console.log('4. Restart your development server');
        console.log('5. Update the GEMINI_API_KEY secret in Supabase Dashboard');
        console.log('6. Redeploy the Edge Function');
    }
}

// Run the tests
const tester = new GeminiTester();
tester.runAllTests().catch(console.error);