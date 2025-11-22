import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.12.0'

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed", message: "Use POST" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Support both FormData and JSON requests
    let audioData: string;
    let mimeType: string;
    let language: string = "en-US";
    
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      // JSON request with base64 audio
      const body = await req.json();
      audioData = body.audio;
      mimeType = body.mimeType || "audio/webm";
      language = body.language || "en-US";
      
      if (!audioData) {
        return new Response(
          JSON.stringify({ error: "bad_request", message: "Expected 'audio' in JSON body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // FormData request
      const form = await req.formData();
      const audio = form.get("audio");
      language = String(form.get("language") || "en-US");

      if (!(audio instanceof File)) {
        return new Response(
          JSON.stringify({ error: "bad_request", message: "Expected 'audio' file in multipart form-data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Convert File to base64
      const arrayBuffer = await audio.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      audioData = base64;
      mimeType = audio.type || "audio/webm";
    }

    // Get Gemini API key from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "config_error", message: "Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare the audio for Gemini
    const audioPart = {
      inlineData: {
        data: audioData.includes(',') ? audioData.split(',')[1] : audioData,
        mimeType: mimeType
      }
    };

    console.log('[Transcribe] Sending audio to Gemini for transcription...');
    console.log('[Transcribe] Audio size:', audioData.length, 'MIME type:', mimeType);

    // Send to Gemini with instruction to transcribe
    const result = await model.generateContent([
      'Transcribe the following audio to text. Return ONLY the transcription, nothing else. If you cannot hear anything or the audio is unclear, return an empty string.',
      audioPart
    ]);

    const response = await result.response;
    const transcript = response.text().trim();

    console.log('[Transcribe] Transcript received, length:', transcript.length);

    return new Response(
      JSON.stringify({
        text: transcript,
        success: true,
        provider: "gemini",
        language,
        mimeType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error('[Transcribe] Error:', err);
    return new Response(
      JSON.stringify({ 
        error: "transcription_error", 
        message: err?.message || String(err),
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
