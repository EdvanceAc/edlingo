import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*';
    const requestedHeaders = req.headers.get('access-control-request-headers') || 'Content-Type, Authorization, Accept, X-Client-Info';
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': requestedHeaders,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Vary': 'Origin, Access-Control-Request-Headers'
      }
    });
  }
  try {
    // Parse request body
    const { message, user_id, session_id, user_level, focus_area } = await req.json()
    
    // Validate required fields
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Gemini AI with API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-pro', // Stable model for reliable responses
      generationConfig: {
        maxOutputTokens: 100, // Reduced for even faster responses
        temperature: 0.6, // Lower temperature for faster, more focused responses
        topP: 0.7, // Reduced for faster token selection
        topK: 20, // Reduced for faster processing
        candidateCount: 1 // Single candidate for fastest generation
      }
    })

    // Create optimized, concise prompts for faster processing
    let contextPrompt = ''
    switch (focus_area) {
      case 'conversation':
        contextPrompt = `Reply conversationally for ${user_level} learners. Be brief and encouraging.`
        break
      case 'grammar':
        contextPrompt = `Grammar help for ${user_level} level. Give short, clear explanations.`
        break
      case 'vocabulary':
        contextPrompt = `Vocabulary help for ${user_level} level. Explain briefly.`
        break
      case 'writing':
        contextPrompt = `Writing feedback for ${user_level} level. Be brief and helpful.`
        break
      default:
        contextPrompt = `Language assistant for ${user_level} learner. Be concise.`
    }

    const fullPrompt = `${contextPrompt}\n\nUser message: ${message}`

    // Check if streaming is requested
    const acceptHeader = req.headers.get('accept') || '';
    const enableStreaming = acceptHeader.includes('text/event-stream') || acceptHeader.includes('text/stream') || req.url.includes('stream=true');
    
    if (enableStreaming) {
      // Create streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await model.generateContentStream(fullPrompt)
            
            for await (const chunk of result.stream) {
               const chunkText = chunk.text()
               if (chunkText) {
                 // Send chunk immediately without buffering
                 const data = `data: ${JSON.stringify({ 
                   content: chunkText, 
                   done: false 
                 })}\n\n`
                 controller.enqueue(new TextEncoder().encode(data))
                 
                 // Force flush for immediate delivery
                 await new Promise(resolve => setTimeout(resolve, 0))
               }
             }
            
            // Send completion signal
            const finalData = `data: ${JSON.stringify({ 
              content: '', 
              done: true 
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(finalData))
            controller.close()
            
          } catch (error) {
            console.error('Streaming error:', error)
            const errorData = `data: ${JSON.stringify({ 
              error: error.message, 
              done: true 
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorData))
            controller.close()
          }
        }
      })
      const origin = req.headers.get('origin') || '*';
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Client-Info',
          'Vary': 'Origin, Access-Control-Request-Headers'
        }
      })
    }
    
    // Non-streaming response (fallback)
    const result = await model.generateContent(fullPrompt)
    const responseText = result.response.text()

    // Optional: Store conversation in Supabase (if needed)
    if (user_id && session_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          
          // Store user message
          await supabase.from('chat_messages').insert({
            user_id,
            session_id,
            content: message,
            message_type: 'user',
            created_at: new Date().toISOString()
          })
          
          // Store AI response
          await supabase.from('chat_messages').insert({
            user_id,
            session_id,
            content: responseText,
            message_type: 'assistant',
            created_at: new Date().toISOString()
          })
        }
      } catch (dbError) {
        console.error('Database storage error:', dbError)
        // Continue without failing the request
      }
    }

    // Return successful response (non-streaming)
    const origin = req.headers.get('origin') || '*';
    return new Response(
      JSON.stringify({ 
        response: responseText,
        success: true
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Client-Info',
          'Vary': 'Origin, Access-Control-Request-Headers'
        } 
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    const origin = req.headers.get('origin') || '*';
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message,
        success: false
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Client-Info',
          'Vary': 'Origin, Access-Control-Request-Headers'
        } 
      }
    )
  }
})