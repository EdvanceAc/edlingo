<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Connecting Your Web App to Gemini via Supabase

To connect your web app to Gemini through Supabase as a proxy, you'll use **Supabase Edge Functions** as the intermediary layer. This architecture provides enhanced security, better error handling, and allows you to store conversation history in your Supabase database.

## Architecture Overview

The flow works as follows:

1. **Your Web App** sends a chat message to **Supabase Edge Function**
2. **Supabase Edge Function** processes the request and calls **Gemini API**
3. **Gemini** responds to the **Edge Function**
4. **Edge Function** returns the response to your **Web App**

## Step-by-Step Implementation

### 1. Set Up Supabase Project and Environment Variables

First, create a new Supabase project at [database.new](https://database.new) if you haven't already[^1][^2].

Next, you'll need to store your Gemini API key securely in Supabase:

1. Go to your **Supabase Dashboard**
2. Navigate to **Edge Functions** → **Secrets**
3. Add a new secret called `GEMINI_API_KEY` with your Google AI Studio API key[^3][^2]

### 2. Create the Edge Function

You can create the Edge Function either via the Supabase CLI or directly from the dashboard[^4][^5]. Here's the complete Edge Function code:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

Deno.serve(async (req) => {
  // Parse request body
  const { message } = await req.json()
  
  // Get Gemini API key from environment variables
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Gemini API key not configured' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Generate response from Gemini
    const result = await model.generateContent(message)
    const response = await result.response
    const text = response.text()

    // Return the response
    return new Response(
      JSON.stringify({ 
        message: text,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    )
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```


### 3. Deploy the Edge Function

**Using the CLI:**

```bash
# Create the function
supabase functions new gemini-chat

# Deploy the function
supabase functions deploy gemini-chat
```

**Using the Dashboard:**

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **"Deploy a new function"** → **"Via Editor"**
3. Name your function (e.g., `gemini-chat`)
4. Paste the code above
5. Click **Deploy**[^4][^5]

### 4. Frontend Integration

Here's how to integrate the Edge Function into your web app:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

// Chat function that calls Supabase Edge Function
async function chatWithGemini(message) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { message }
    })
    
    if (error) {
      console.error('Error:', error)
      return 'Sorry, there was an error processing your request.'
    }
    
    return data.message
  } catch (error) {
    console.error('Network error:', error)
    return 'Sorry, there was a network error.'
  }
}

// Example usage in your web app
document.getElementById('send-button').addEventListener('click', async () => {
  const input = document.getElementById('chat-input')
  const chatContainer = document.getElementById('chat-container')
  
  const userMessage = input.value
  if (!userMessage.trim()) return
  
  // Display user message
  chatContainer.innerHTML += `
    <div class="user-message">You: ${userMessage}</div>
  `
  
  // Show loading indicator
  chatContainer.innerHTML += `
    <div class="bot-message loading">Bot: Thinking...</div>
  `
  
  // Get response from Gemini via Supabase
  const response = await chatWithGemini(userMessage)
  
  // Remove loading and show response
  const loadingElement = chatContainer.querySelector('.loading')
  loadingElement.remove()
  
  chatContainer.innerHTML += `
    <div class="bot-message">Bot: ${response}</div>
  `
  
  // Clear input
  input.value = ''
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight
})
```


## Advanced Implementation: Chat with Storage

To store chat history in your Supabase database, first create the necessary table:

```sql
-- Create table for storing chat messages
CREATE TABLE chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  message text NOT NULL,
  is_user boolean NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for better query performance
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own messages
CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Then update your Edge Function to store messages:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const { message, userId, chatId } = await req.json()
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Initialize Gemini
  const apiKey = Deno.env.get('GEMINI_API_KEY')!
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  try {
    // Store user message in database
    await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        user_id: userId,
        message: message,
        is_user: true,
        created_at: new Date().toISOString()
      })

    // Get response from Gemini
    const result = await model.generateContent(message)
    const response = await result.response
    const botResponse = response.text()

    // Store bot response in database
    await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        user_id: userId,
        message: botResponse,
        is_user: false,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        message: botResponse,
        chatId: chatId
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat message' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```


## Alternative Approaches

### Using Database Webhooks

You can also trigger Gemini responses automatically when new messages are inserted into your database using **Supabase Database Webhooks**[^6][^7]. This approach allows for event-driven processing where database changes automatically trigger your Edge Function.

### Using Third-Party Integration Platforms

For no-code solutions, you can use platforms like **BuildShip**[^8][^9], **N8N**[^10][^11], or **Pipedream**[^12][^13] to create workflows that connect Supabase and Gemini without writing custom code.

## Key Benefits of This Architecture

1. **Security**: Your Gemini API key stays secure on the server side[^3][^2]
2. **Error Handling**: Centralized error handling and logging[^14][^15]
3. **Rate Limiting**: Control API usage through your Edge Function
4. **Data Storage**: Store and retrieve chat history from your database
5. **Authentication**: Integrate with Supabase Auth for user management
6. **Scalability**: Edge Functions automatically scale globally[^16][^17]

This setup gives you complete control over the communication between your web app and Gemini while maintaining security and providing additional features like conversation storage and user authentication.

<div style="text-align: center">⁂</div>

[^1]: https://www.buildcamp.io/guides/debugging-supabase-edge-functions

[^2]: https://dev.to/danielsogl/generating-and-storing-google-gemini-embeddings-with-vercel-ai-sdk-and-supabase-283d

[^3]: https://supabase.com/docs/guides/api/api-keys

[^4]: https://supabase.com/docs/guides/functions/secrets

[^5]: https://github.com/agenticsorg/edge-agents/blob/main/docs/secrets_management.md

[^6]: https://supabase.com/features/database-webhooks

[^7]: https://supabase.com/docs/guides/database/webhooks

[^8]: https://buildship.com/integrations/apps/supabase-and-gemini

[^9]: https://buildship.com/integrations/apps/gemini-and-supabase

[^10]: https://n8n.io/integrations/google-ai-studio-gemini/and/supabase/

[^11]: https://n8n.io/integrations/google-gemini-chat-model/and/supabase/

[^12]: https://pipedream.com/apps/google-gemini/integrations/supabase

[^13]: https://pipedream.com/apps/supabase-management-api/integrations/google-gemini/generate-embeddings-with-google-gemini-api-on-new-backup-completed-from-supabase-management-api-api-int_0Gsj34XZ

[^14]: https://supabase.com/docs/guides/troubleshooting/inspecting-edge-function-environment-variables-wg5qOQ

[^15]: https://supabase.com/docs/guides/functions/quickstart-dashboard

[^16]: https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions

[^17]: https://supabase.com/docs/guides/functions/quickstart

[^18]: https://www.youtube.com/watch?v=no6tpWy5Zns

[^19]: https://www.bytebase.com/blog/supabase-vs-firebase/

[^20]: https://backmesh.com/docs/supabase/

[^21]: https://www.youtube.com/watch?v=LSq9UN6ODQ0

[^22]: https://stackoverflow.com/questions/79546925/dependency-conflict-with-ktor-between-gemini-api-and-supabase

[^23]: https://brightdata.com/blog/ai/lovable-with-supabase-and-bright-data

[^24]: https://www.reddit.com/r/Supabase/comments/1d1rqdr/microservice_as_proxy_to_supabase/

[^25]: https://supabase.com/docs/guides/functions

[^26]: https://github.com/topics/supabase-functions

[^27]: https://supabase.com/blog/simplify-backend-with-data-api

[^28]: https://www.aibase.com/repos/project/gemini-rewrite-proxy

[^29]: https://github.com/topics/gemini-api?l=go\&o=desc\&s=

[^30]: https://www.youtube.com/watch?v=X6GPVNLFwmg

[^31]: https://github.com/BerriAI/litellm

[^32]: https://www.reddit.com/r/boltnewbuilders/comments/1jdik4s/deploying_edge_functions_to_supabase/

[^33]: https://github.com/snailyp/gemini-balance

[^34]: https://www.reddit.com/r/Supabase/comments/1kq8n4k/solved_supabase_edge_function_terminating_when/

[^35]: https://www.reddit.com/r/FlutterFlow/comments/1e4yilk/q_flutterflow_gemini_supabase_how_to/

[^36]: https://www.youtube.com/watch?v=jT6BAdj47ZU

[^37]: https://supabase.com/partners/integrations

[^38]: https://dev.whop.com/tutorials/chat-bot

[^39]: https://n8n.io/integrations/webhook/and/supabase/

[^40]: https://supabase.com/ui/docs/nextjs/realtime-chat

[^41]: https://docs-chiae8gzf-supabase.vercel.app/docs/guides/functions/secrets

[^42]: https://www.youtube.com/watch?v=Tkk1UXXR3xw

[^43]: https://zenn.dev/masa5714/scraps/5f603ac83e23ef

[^44]: https://trigger.dev/docs/guides/frameworks/supabase-edge-functions-basic

[^45]: https://docs-b8tmkljqz-supabase.vercel.app/docs/guides/functions/secrets

[^46]: https://www.youtube.com/watch?v=DmErV2mvvH0

[^47]: https://www.youtube.com/watch?v=4CYVy4hlVV0

[^48]: https://supabase.com/edge-functions

[^49]: https://www.youtube.com/watch?v=5OWH9c4u68M

[^50]: https://pipedream.com/apps/gemini-public/integrations/supabase-management-api

