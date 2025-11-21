import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.12.0'

// Base CORS headers; dynamically set allowed headers and origin on requests
const baseCorsHeaders = {
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
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
  // Handle CORS preflight with dynamic headers
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*'
    const requestedHeaders = req.headers.get('access-control-request-headers') || 'Content-Type, Authorization, Accept, X-Client-Info, Cache-Control, Connection'
    return new Response(null, {
      status: 204,
      headers: {
        ...baseCorsHeaders,
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': requestedHeaders,
        'Vary': 'Origin, Access-Control-Request-Headers'
      }
    })
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
    // Use a model alias compatible with v1beta streaming
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 256, // Allow complete short responses while encouraging brevity
      }
    })

    // Create system prompt for live conversation
    const systemPrompt = `You are a helpful language learning assistant in a live voice conversation. 
CRITICAL: Keep responses VERY SHORT (15-30 words max, 1-2 sentences).
- Natural and conversational
- Encouraging and supportive
- Use singular "you"
- Help practice ${language} at ${user_level} level
- Gently correct mistakes briefly
- Ask short follow-up questions

Focus: ${focus_area}

Example good responses:
- "That's great! How was your day?"
- "Good job! What did you do yesterday?"
- "Nice! Tell me more about that."

Keep it brief for faster audio!`

    if (streaming) {
      const origin = req.headers.get('origin') || '*'
      // Set up SSE streaming
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      // Start streaming response
      const streamResponse = async () => {
        try {
          console.log('[Live] Starting streaming with message:', message)
          const result = await model.generateContentStream({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              { role: 'model', parts: [{ text: 'Understood. I will help the user practice their language skills in a supportive and conversational way.' }] },
              { role: 'user', parts: [{ text: message }] }
            ]
          })
          let fullResponse = ''
          console.log('[Live] Stream started, waiting for chunks...')
          let ttsStarted = false
          let ttsPromise: Promise<any> | null = null

          // Helper to start TTS generation in parallel (for faster audio playback)
          const startTTS = (text: string) => {
            if (ttsStarted || !text || text.trim().length === 0) return
            ttsStarted = true
            
            ttsPromise = fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text }
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
                })
              }
            ).catch(err => {
              console.warn('Parallel TTS generation failed:', err)
              return null
            })
          }

          // Helper to send audio data as soon as it's ready
          const sendAudioWhenReady = async () => {
            if (!ttsPromise) return
            
            try {
              const ttsResp = await ttsPromise
              if (ttsResp && ttsResp.ok) {
                const ttsJson = await ttsResp.json()
                const parts = ttsJson?.candidates?.[0]?.content?.parts || []
                const inline = parts.find((p: any) => p.inlineData)
                if (inline?.inlineData?.data) {
                  const audioData = {
                    data: inline.inlineData.data,
                    mimeType: inline.inlineData.mimeType || 'audio/wav'
                  }
                  
                  // Send audio immediately as a separate SSE event
                  const audioEvent = JSON.stringify({
                    content: '',
                    audioData: audioData,
                    done: false,
                    session_id: session_id
                  })
                  
                  await writer.write(encoder.encode(`data: ${audioEvent}\n\n`))
                } else {
                  console.warn('TTS response did not contain inlineData audio')
                }
              } else if (ttsResp) {
                console.warn('TTS REST call failed:', ttsResp.status, ttsResp.statusText)
              }
            } catch (ttsError) {
              console.warn('TTS generation failed:', ttsError)
            }
          }

          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            console.log('[Live] Received chunk, length:', chunkText?.length || 0)
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
          console.log('[Live] Stream complete, fullResponse length:', fullResponse.length)

          // Now that we have the complete response, generate TTS from the full text
          // This ensures audio plays the complete answer without cutting off
          if (fullResponse.trim().length > 0) {
            startTTS(fullResponse)
            // Send audio as soon as TTS completes
            await sendAudioWhenReady()
          }

          // Send final message (audio already sent earlier when ready)
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
          ...baseCorsHeaders,
          'Access-Control-Allow-Origin': origin,
          'Content-Type': 'text/event-stream',
          'X-Accel-Buffering': 'no', // prevent proxy buffering (e.g., NGINX)
          'Vary': 'Origin'
        },
      })
    } else {
      const origin = req.headers.get('origin') || '*'
      // Non-streaming response
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I will help the user practice their language skills in a supportive and conversational way.' }] },
          { role: 'user', parts: [{ text: message }] }
        ]
      })
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
            ...baseCorsHeaders,
            'Access-Control-Allow-Origin': origin,
            'Content-Type': 'application/json',
            'Vary': 'Origin'
          } 
        }
      )
    }
  } catch (error) {
    console.error('Error in process-live-conversation:', error)
    // Safely detect if API key is configured in environment
    const hasApiKey = !!Deno.env.get('GEMINI_API_KEY')
    const origin = req.headers.get('origin') || '*'
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
          ...baseCorsHeaders,
          'Access-Control-Allow-Origin': origin,
          'Content-Type': 'application/json',
          'Vary': 'Origin'
        } 
      }
    )
  }
})
