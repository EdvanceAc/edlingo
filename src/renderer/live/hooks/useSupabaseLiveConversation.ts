import { useCallback, useState } from "react";
import supabaseGeminiService from "../../services/supabaseGeminiService.js";

export type LiveRole = "user" | "assistant";

export type LiveMessage = {
  id: string;
  role: LiveRole;
  text: string;
  timestamp: Date;
};

export type SupabaseLiveOptions = {
  userLevel?: string;
  focusArea?: string;
  language?: string;
};

export type UseSupabaseLiveConversationResult = {
  messages: LiveMessage[];
  partialResponse: string;
  isStreaming: boolean;
  error: string | null;
  sendUtterance: (text: string) => Promise<void>;
  clearConversation: () => void;
};

export function useSupabaseLiveConversation(
  options: SupabaseLiveOptions = {}
): UseSupabaseLiveConversationResult {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [partialResponse, setPartialResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playAudioFromInlineData = useCallback((audioData: any) => {
    console.log('[LiveConvo] playAudioFromInlineData called');
    try {
      if (!audioData || !audioData.data) {
        console.warn('[LiveConvo] No audioData or audioData.data');
        return;
      }

      console.log('[LiveConvo] Decoding base64 audio data...');
      const binary = atob(audioData.data);
      const len = binary.length;
      const pcmBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        pcmBytes[i] = binary.charCodeAt(i);
      }

      const mime = audioData.mimeType || "audio/wav";
      let blobBytes: Uint8Array = pcmBytes;
      let blobType = mime;

      console.log('[LiveConvo] Audio MIME type:', mime, 'Raw bytes:', len);

      // Gemini TTS returns raw 16-bit PCM like "audio/L16;codec=pcm;rate=24000".
      // Wrap this PCM data in a WAV container so browsers can play it reliably.
      if (mime.startsWith("audio/L16") || mime.includes("pcm")) {
        let sampleRate = 24000;
        const rateMatch = /rate=(\d+)/.exec(mime);
        if (rateMatch) {
          const parsed = parseInt(rateMatch[1], 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            sampleRate = parsed;
          }
        }

        const numChannels = 1;
        const bitsPerSample = 16;
        const headerSize = 44;
        const dataSize = pcmBytes.byteLength;
        const buffer = new ArrayBuffer(headerSize);
        const view = new DataView(buffer);

        let offset = 0;
        const writeString = (s: string) => {
          for (let i = 0; i < s.length; i++) {
            view.setUint8(offset++, s.charCodeAt(i));
          }
        };

        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;

        writeString("RIFF");
        view.setUint32(offset, 36 + dataSize, true); offset += 4;
        writeString("WAVE");
        writeString("fmt ");
        view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size (PCM)
        view.setUint16(offset, 1, true); offset += 2; // AudioFormat (PCM)
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, byteRate, true); offset += 4;
        view.setUint16(offset, blockAlign, true); offset += 2;
        view.setUint16(offset, bitsPerSample, true); offset += 2;
        writeString("data");
        view.setUint32(offset, dataSize, true); offset += 4;

        const headerBytes = new Uint8Array(buffer);
        const wavBytes = new Uint8Array(headerSize + dataSize);
        wavBytes.set(headerBytes, 0);
        wavBytes.set(pcmBytes, headerSize);

        blobBytes = wavBytes;
        blobType = "audio/wav";
      }

      const blobPart: BlobPart = blobBytes as any;
      const blob = new Blob([blobPart], { type: blobType });
      const url = URL.createObjectURL(blob);
      console.log('[LiveConvo] Created audio blob URL:', url, 'type:', blobType, 'size:', blob.size);
      
      const audio = new Audio(url);
      audio.onended = () => {
        console.log('[LiveConvo] Audio playback ended');
        URL.revokeObjectURL(url);
      };
      audio.onerror = (e) => {
        console.error('[LiveConvo] Audio playback error:', e);
        URL.revokeObjectURL(url);
      };
      
      console.log('[LiveConvo] Starting audio playback...');
      audio.play()
        .then(() => {
          console.log('[LiveConvo] Audio playback started successfully');
        })
        .catch((err) => {
          console.error("[LiveConvo] Audio playback failed:", err);
        });
    } catch (e) {
      console.error("[LiveConvo] Failed to play inline audio from Supabase live conversation:", e);
    }
  }, []);

  const sendUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setPartialResponse("");

      const userMessage: LiveMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        text: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsStreaming(true);

      try {
        const result: any = await supabaseGeminiService.sendLiveConversationMessage(
          trimmed,
          {
            userLevel: options.userLevel || "intermediate",
            focusArea: options.focusArea || "conversation",
            language: options.language || "English",
            streaming: true,
          }
        );

        // Streaming path
        if (result && result.success && result.stream) {
          let full = "";
          let hadText = false;
          let audioPlayed = false; // Track if we've already played audio
          
          for await (const chunk of result.stream as any) {
            console.log('[LiveConvo] Received chunk:', {
              hasChunk: !!chunk?.chunk,
              hasDone: !!chunk?.done,
              hasAudioData: !!chunk?.audioData
            });
            
            if (chunk?.chunk) {
              full = chunk.fullResponse || full + chunk.chunk;
              setPartialResponse(full);
              if (chunk.chunk && String(chunk.chunk).trim()) {
                hadText = true;
              }
            }
            
            // Play audio immediately as soon as it arrives (even if text is still streaming)
            if (chunk?.audioData && !audioPlayed) {
              console.log('[LiveConvo] Audio data received, attempting playback...', {
                hasMimeType: !!chunk.audioData.mimeType,
                dataLength: chunk.audioData.data?.length || 0
              });
              playAudioFromInlineData(chunk.audioData);
              audioPlayed = true;
            }
            
            if (chunk?.done) {
              const finalText = chunk.fullResponse || full;
              if (finalText && finalText.trim()) {
                hadText = true;
                const aiMessage: LiveMessage = {
                  id: `${Date.now()}-ai`,
                  role: "assistant",
                  text: finalText,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
              }

              break;
            }
          }

          // If the stream completed without any text content, surface a fallback message
          if (!hadText) {
            const aiMessage: LiveMessage = {
              id: `${Date.now()}-ai-empty`,
              role: "assistant",
              text:
                "I couldn't generate a response just now. Please try asking again or rephrasing your question.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } else {
          // Non-streaming or error-like response
          let fallbackText = "";
          if (result?.response) {
            fallbackText = String(result.response);
          } else if (result?.error) {
            fallbackText = String(result.error);
          }

          if (!fallbackText) {
            fallbackText = "I had trouble responding to that. Please try again.";
          }

          const aiMessage: LiveMessage = {
            id: `${Date.now()}-ai`,
            role: "assistant",
            text: fallbackText,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      } catch (e: any) {
        console.error("Supabase live conversation error:", e);
        const message = e?.message || "Unexpected error during live conversation.";
        setError(message);
        const aiMessage: LiveMessage = {
          id: `${Date.now()}-ai-error`,
          role: "assistant",
          text:
            "Sorry, I encountered a problem while connecting to the live conversation service. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } finally {
        // Stop streaming indicator and clear only the transient streaming bubble.
        // The final AI answer is kept in the messages array.
        setIsStreaming(false);
        setPartialResponse("");
      }
    },
    [isStreaming, options.focusArea, options.language, options.userLevel, playAudioFromInlineData]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setPartialResponse("");
    setError(null);
  }, []);

  return {
    messages,
    partialResponse,
    isStreaming,
    error,
    sendUtterance,
    clearConversation,
  };
}
