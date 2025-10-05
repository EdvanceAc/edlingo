import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LiveConversationRequest {
  message: string
  session_id: string
  user_id?: string
  user_level?: string
  focus_area?: string
  language?: string
  streaming?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      message, 
      session_id,
      user_id,
      user_level = 'intermediate',
      focus_area = 'conversation',
      language = 'English',
      streaming = true
    } = await req.json() as LiveConversationRequest

    // Get Gemini API key from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })

    // Create system prompt for live conversation
    const systemPrompt = `You are a helpful language learning assistant engaged in a live voice conversation. 
Keep your responses:
- Conversational and natural
- Concise but informative (1-3 sentences typically)
- Encouraging and supportive
- Focused on helping the user practice ${language}
- Appropriate for ${user_level} level
- Gently correct mistakes when needed
- Ask follow-up questions to keep the conversation flowing

User's focus area: ${focus_area}
Current message: ${message}`

    if (streaming) {
      // Set up SSE streaming
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      // Start streaming response
      const streamResponse = async () => {
        try {
          const result = await model.generateContentStream(systemPrompt)
          let fullResponse = ''

          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            if (chunkText) {
              fullResponse += chunkText
              
              // Send SSE formatted chunk
              const data = JSON.stringify({
                content: chunkText,
                fullResponse: fullResponse,
                done: false,
                session_id: session_id
              })
              
              await writer.write(encoder.encode(`data: ${data}\n\n`))
            }
          }

          // Send final message
          const finalData = JSON.stringify({
            content: '',
            fullResponse: fullResponse,
            done: true,
            session_id: session_id
          })
          
          await writer.write(encoder.encode(`data: ${finalData}\n\n`))
          await writer.close()
        } catch (error) {
          // Send error in stream
          const errorData = JSON.stringify({
            error: error.message,
            done: true
          })
          await writer.write(encoder.encode(`data: ${errorData}\n\n`))
          await writer.close()
        }
      }

      // Start streaming in background
      streamResponse()

      // Return SSE response
      return new Response(stream.readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Non-streaming response
      const result = await model.generateContent(systemPrompt)
      const response = result.response.text()

      return new Response(
        JSON.stringify({
          response: response,
          session_id: session_id,
          success: true,
          geminiUsed: true,
          source: 'gemini-api',
          debug: {
            hasApiKey: !!GEMINI_API_KEY,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
  } catch (error) {
    console.error('Error in process-live-conversation:', error)
    // Safely detect if API key is configured in environment
    const hasApiKey = !!Deno.env.get('GEMINI_API_KEY')

    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        geminiUsed: false,
        source: 'error',
        apiKeyConfigured: hasApiKey,
        debug: {
          hasApiKey,
          errorMessage: error.message,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
