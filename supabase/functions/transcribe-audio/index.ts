import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const form = await req.formData();
    const audio = form.get("audio");
    const language = String(form.get("language") || "en-US");

    if (!(audio instanceof File)) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "Expected 'audio' file in multipart form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Scaffold only: no STT provider configured yet. Return 501 with a helpful message.
    // You can integrate a provider here (e.g., Google Cloud Speech, OpenAI Whisper, Deepgram, AssemblyAI).
    // Ensure to add required API keys/credentials via project environment variables before enabling.
    const info = {
      provider: null,
      language,
      size: audio.size,
      type: audio.type || "audio/webm",
    };

    return new Response(
      JSON.stringify({
        text: "",
        message: "Transcription not implemented. Function scaffolded successfully.",
        info,
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
