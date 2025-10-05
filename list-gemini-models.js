import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listGeminiModels() {
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }

  console.log('🔍 Listing available Gemini models...');
  console.log('API Key:', geminiApiKey.substring(0, 10) + '...');

  try {
    console.log('\n📤 Making ListModels API call...');
    console.log('URL: https://generativelanguage.googleapis.com/v1beta/models');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ Available models:');
      
      if (data.models && Array.isArray(data.models)) {
        data.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
          if (model.supportedGenerationMethods) {
            console.log(`   Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
          }
          if (model.description) {
            console.log(`   Description: ${model.description}`);
          }
          console.log('');
        });

        // Find models that support generateContent
        const generateContentModels = data.models.filter(model => 
          model.supportedGenerationMethods && 
          model.supportedGenerationMethods.includes('generateContent')
        );

        console.log('\n🎯 Models that support generateContent:');
        generateContentModels.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
        });

      } else {
        console.log('No models found in response');
        console.log('Raw response:', responseText);
      }
    } else {
      console.log('\n❌ API call failed');
      console.log('Error response:', responseText);
    }

  } catch (error) {
    console.error('\n💥 Error occurred:', error.message);
    console.error('Stack:', error.stack);
  }
}

listGeminiModels();