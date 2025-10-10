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

    // Initialize Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }


    // Create optimized, concise prompts for faster processing
    let contextPrompt = ''
    switch (focus_area) {
      case 'conversation':
        contextPrompt = `Reply conversationally for ${user_level} learners. Be brief and encouraging. Always address the user as a single individual; use singular "you".`
        break
      case 'grammar':
        contextPrompt = `Grammar help for ${user_level} level. Give short, clear explanations. Always address the user as a single individual; use singular "you".`
        break
      case 'vocabulary':
        contextPrompt = `Vocabulary help for ${user_level} level. Explain briefly. Always address the user as a single individual; use singular "you".`
        break
      case 'writing':
        contextPrompt = `Writing feedback for ${user_level} level. Be brief and helpful. Always address the user as a single individual; use singular "you".`
        break
      default:
        contextPrompt = `Language assistant for ${user_level} learner. Be concise. Always address the user as a single individual; use singular "you".`
    }

    const fullPrompt = `${contextPrompt}\n\nUser message: ${message}`

    // Call Gemini API directly using REST
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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
    })

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'

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