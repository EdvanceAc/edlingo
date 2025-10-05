import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGeminiRestAPI() {
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }

  console.log('🧪 Testing Gemini REST API directly...');
  console.log('API Key:', geminiApiKey.substring(0, 10) + '...');

  const testMessage = "Hello, how are you?";
  const contextPrompt = "Language assistant for beginner learner. Be concise.";
  const fullPrompt = `${contextPrompt}\n\nUser message: ${testMessage}`;

  try {
    console.log('\n📤 Making REST API call...');
    console.log('URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');
    console.log('Prompt:', fullPrompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.6,
          topP: 0.7,
          topK: 20,
        }
      })
    });

    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Raw Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      console.log('\n✅ Success!');
      console.log('Generated text:', generatedText);
    } else {
      console.log('\n❌ API call failed');
      console.log('Error response:', responseText);
    }

  } catch (error) {
    console.error('\n💥 Error occurred:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGeminiRestAPI();