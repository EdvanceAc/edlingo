# Process Gemini Chat Edge Function

This Supabase Edge Function handles Gemini AI chat requests with optimized performance settings.

## Features

- **Fast Response Times**: Uses `gemini-1.5-flash` model with limited output tokens (150)
- **Context-Aware**: Adapts responses based on user level and focus area
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **CORS Support**: Configured for cross-origin requests
- **Optional Database Storage**: Stores conversation history in Supabase

## Deployment

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

### Deploy the Function

1. **Using the deployment script** (recommended):
   ```bash
   node deploy-edge-function.js
   ```

2. **Manual deployment**:
   ```bash
   supabase functions deploy process-gemini-chat
   ```

### Environment Variables

Set these secrets in your Supabase Dashboard > Edge Functions > Secrets:

- `GEMINI_API_KEY`: Your Google Gemini API key
- `SUPABASE_URL`: Your Supabase project URL (optional, for conversation storage)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional, for conversation storage)

## API Usage

### Request Format

```javascript
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-gemini-chat

{
  "message": "Hello, how are you?",
  "user_id": "user-uuid",
  "session_id": "session-uuid",
  "user_level": "beginner",
  "focus_area": "conversation"
}
```

### Response Format

**Success Response:**
```javascript
{
  "response": "Hello! I'm doing well, thank you for asking. How are you today?",
  "success": true
}
```

**Error Response:**
```javascript
{
  "error": "Failed to process request",
  "details": "Error details here",
  "success": false
}
```

### Parameters

- `message` (required): The user's message
- `user_id` (optional): User identifier for conversation storage
- `session_id` (optional): Session identifier for conversation storage
- `user_level` (optional): User's language level (beginner, intermediate, advanced)
- `focus_area` (optional): Learning focus (conversation, grammar, vocabulary, writing)

## Performance Optimizations

- **Model**: Uses `gemini-1.5-flash` for faster responses
- **Token Limit**: Limited to 150 output tokens for quicker generation
- **Temperature**: Set to 0.7 for balanced creativity and consistency
- **Context-Aware Prompts**: Tailored prompts based on user level and focus area

## Monitoring

- View function logs in Supabase Dashboard > Edge Functions > Logs
- Monitor performance metrics in the dashboard
- Set up alerts for error rates or response times

## Troubleshooting

### Common Issues

1. **"Gemini API key not configured"**
   - Set the `GEMINI_API_KEY` secret in Supabase Dashboard

2. **CORS errors**
   - The function includes CORS headers, but ensure your client is making proper requests

3. **Timeout errors**
   - The function is optimized for speed, but network issues can cause timeouts
   - Check your Gemini API quota and rate limits

4. **Database storage errors**
   - Ensure `chat_messages` table exists in your Supabase database
   - Check RLS policies allow the service role to insert messages

### Testing

Test the function using curl:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-gemini-chat' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello, test message",
    "user_level": "beginner",
    "focus_area": "conversation"
  }'
```

## Development

### Local Testing

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Serve functions locally:
   ```bash
   supabase functions serve
   ```

3. Test the function:
   ```bash
   curl -X POST 'http://localhost:54321/functions/v1/process-gemini-chat' \
     -H 'Content-Type: application/json' \
     -d '{"message": "test"}'
   ```

### Code Structure

- `index.ts`: Main function code
- `deno.json`: Dependencies and TypeScript configuration
- `README.md`: This documentation

## Security

- API keys are stored as Supabase secrets (encrypted)
- CORS is configured for your domain
- Input validation prevents malicious requests
- Error messages don't expose sensitive information