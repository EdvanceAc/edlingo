#!/usr/bin/env node

// Direct Gemini TTS test: calls gemini-2.5-flash-preview-tts and checks for inlineData audio

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY / VITE_GEMINI_API_KEY in .env');
    process.exit(1);
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

  const body = {
    contents: [
      {
        parts: [
          { text: 'Say in a friendly, natural voice: Hello from the direct Gemini TTS test.' }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Kore'
          }
        }
      }
    },
    model: 'gemini-2.5-flash-preview-tts'
  };

  console.log('POST', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Raw body:', text.slice(0, 500)); // avoid dumping huge base64

    try {
      const json = JSON.parse(text);
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const inline = parts.find(p => p.inlineData);
      if (inline && inline.inlineData && inline.inlineData.data) {
        console.log('✅ Gemini TTS returned inline audio data. mimeType =', inline.inlineData.mimeType, 'base64 length =', inline.inlineData.data.length);
      } else {
        console.log('⚠️ Gemini TTS response did NOT contain inlineData audio.');
      }
    } catch (e) {
      console.warn('Failed to parse JSON from TTS response:', e.message);
    }
  } catch (err) {
    console.error('Error calling Gemini TTS:', err);
    process.exit(1);
  }
}

main();
