#!/usr/bin/env node

// Simple tester for the process-live-conversation Supabase Edge Function
// Uses .env via dotenv to configure SUPABASE_URL and keys

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testNonStreaming(url, anonKey) {
  const payload = {
    message: 'Hello from test-live-conversation-edge.js (non-streaming)',
    session_id: 'mcp-live-test-session-nonstream',
    user_id: 'mcp-live-test-user',
    user_level: 'intermediate',
    focus_area: 'conversation',
    language: 'English',
    streaming: false
  };

  console.log('\n=== Non-streaming test ===');
  console.log('POST', url);
  console.log('Payload:', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Raw body:', text);

  try {
    const json = JSON.parse(text);
    console.log('Parsed JSON:', json);
  } catch (e) {
    console.warn('Response was not valid JSON');
  }
}

async function testStreaming(url, anonKey) {
  const payload = {
    message: 'Hello from test-live-conversation-edge.js (streaming + TTS)',
    session_id: 'mcp-live-test-session-stream',
    user_id: 'mcp-live-test-user',
    user_level: 'intermediate',
    focus_area: 'conversation',
    language: 'English',
    streaming: true
  };

  console.log('\n=== Streaming test (SSE + TTS) ===');
  console.log('POST', url);
  console.log('Payload:', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status);
  if (!res.body) {
    console.error('No response body for streaming request');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';
  let sawAudio = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6);
      try {
        const data = JSON.parse(jsonStr);
        if (data.content && !data.done) {
          fullResponse += data.content;
        }
        // Check for audioData in ANY event (not just final)
        if (data.audioData && data.audioData.data && !sawAudio) {
          sawAudio = true;
          console.log('✅ Received audioData in SSE stream. mimeType =', data.audioData.mimeType, 'base64 length =', data.audioData.data.length);
        }
        if (data.done) {
          if (data.fullResponse) {
            fullResponse = data.fullResponse;
          }
        }
      } catch (e) {
        console.warn('Failed to parse SSE data chunk:', e);
      }
    }
  }

  console.log('Full text response length:', fullResponse.length);
  console.log('Saw audioData:', sawAudio);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.error('Invalid or missing SUPABASE_URL / VITE_SUPABASE_URL from .env');
    process.exit(1);
  }
  if (!anonKey) {
    console.error('Missing SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY from .env');
    process.exit(1);
  }

  const url = `${supabaseUrl}/functions/v1/process-live-conversation`;

  await testNonStreaming(url, anonKey);
  await testStreaming(url, anonKey);
}

main();
