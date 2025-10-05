/**
 * List Available Gemini Models
 * This script lists all available models for the current API key
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
        console.log('❌ No API key found in VITE_GEMINI_API_KEY');
        return;
    }

    console.log('🔍 Listing available Gemini models...');
    console.log(`Using API key: ${apiKey.substring(0, 20)}...`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // List all available models
        const models = await genAI.listModels();
        
        console.log('\n✅ Available models:');
        console.log('='.repeat(50));
        
        for (const model of models) {
            console.log(`Model: ${model.name}`);
            console.log(`Display Name: ${model.displayName}`);
            console.log(`Description: ${model.description}`);
            console.log(`Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            console.log('-'.repeat(30));
        }
        
    } catch (error) {
        console.log('❌ Failed to list models');
        console.log('Error:', error.message);
    }
}

listModels();