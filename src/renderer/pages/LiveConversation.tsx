import { useEffect, useRef, useState } from "react";
import "../live/App.scss";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Mic, MicOff, Settings, Info, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { useSupabaseLiveConversation } from "../live/hooks/useSupabaseLiveConversation";
// SidePanel hidden per UI requirement

// Read Gemini API key from env (support multiple variable names and runtime-injected fallbacks)
const API_KEY = (
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_GEMINI_API_KEY ||
  (typeof window !== 'undefined' ? (window as any)?.__ENV__?.VITE_GEMINI_API_KEY : undefined) ||
  (typeof window !== 'undefined' ? (window as any)?.__ENV__?.VITE_GOOGLE_GEMINI_API_KEY : undefined) ||
  (typeof window !== 'undefined' ? (window as any)?.ENV?.VITE_GEMINI_API_KEY : undefined) ||
  (typeof window !== 'undefined' ? (window as any)?.ENV?.VITE_GOOGLE_GEMINI_API_KEY : undefined)
) as string | undefined;

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 ring-1 ring-white/30">
      <span
        className={clsx(
          "inline-block w-2 h-2 rounded-full",
          isActive ? "bg-emerald-400" : "bg-rose-400"
        )}
      />
      <span className="text-sm text-white/95">
        {isActive ? "Connected via Supabase" : "Idle"}
      </span>
      <Mic className="w-4 h-4 text-white/90" />
    </div>
  );
}

export default function LiveConversation() {
  void API_KEY;
  const [textInput, setTextInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sttAvailable, setSttAvailable] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  const {
    messages,
    partialResponse,
    isStreaming,
    error,
    sendUtterance,
    clearConversation,
  } = useSupabaseLiveConversation({
    userLevel: "intermediate",
    focusArea: "conversation",
    language: "English",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const has =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setSttAvailable(has);
  }, []);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = () => {
    if (!sttAvailable || isListening || isStreaming) return;
    if (typeof window === "undefined") return;

    const SpeechRecognition: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = async (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final.trim()) {
        setInterimTranscript("");
        await sendUtterance(final.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error("Speech recognition start failed:", e);
    }
  };

  const stopListening = () => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  };

  const handleSend = async () => {
    const trimmed = textInput.trim();
    if (!trimmed || isStreaming) return;
    setTextInput("");
    await sendUtterance(trimmed);
  };

  const isActive = isStreaming || isListening;

  return (
    <div className="App">
      {/* Hero Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-7xl px-4 md:px-6"
      >
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl ring-1 ring-white/20 p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Live Conversation</h1>
              <p className="mt-2 text-sm md:text-base text-white/90">
                Practice interactive speaking with the AI assistant, improve
                pronunciation, and get instant feedback. Speak or type to begin.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/25 px-3 py-2 text-sm text-white hover:bg-white/15 transition"
              title="Help"
            >
              <Info className="w-4 h-4 text-white/90" />
              <span className="hidden sm:inline">Help</span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Main Grid */}
      <div className="streaming-console">
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6">
          <div className="flex justify-center items-center w-full min-h-[50vh]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl ring-1 ring-white/20 p-6 md:p-8 w-full max-w-3xl"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-white/90" />
                  <h2 className="text-base md:text-lg font-semibold text-white">
                    Session Controls
                  </h2>
                </div>
                <StatusBadge isActive={isActive} />
              </div>

              <div className="rounded-xl bg-white/10 ring-1 ring-white/25 p-4">
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {messages.length === 0 &&
                    !partialResponse &&
                    !interimTranscript && (
                      <div className="text-sm text-white/85 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>
                          Start speaking or type a message to begin a Supabase-powered
                          live conversation.
                        </span>
                      </div>
                    )}

                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={clsx(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={clsx(
                          "px-3 py-2 rounded-2xl text-sm max-w-sm",
                          m.role === "user"
                            ? "bg-white text-indigo-700"
                            : "bg-indigo-500/80 text-white"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  ))}

                  {interimTranscript && (
                    <div className="flex justify-end">
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-sm bg-white/80 text-indigo-700 italic">
                        {interimTranscript}
                      </div>
                    </div>
                  )}

                  {partialResponse && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-sm bg-indigo-500/70 text-white border border-white/40">
                        <p className="whitespace-pre-wrap">{partialResponse}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-indigo-50">
                          {isStreaming ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>AI is responding via Supabase...</span>
                            </>
                          ) : (
                            <span>AI response via Supabase</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-3 text-xs text-red-100 bg-red-500/40 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      disabled={!sttAvailable || isStreaming}
                      className={clsx(
                        "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium",
                        !sttAvailable
                          ? "bg-white/10 text-white/50 cursor-not-allowed"
                          : isListening
                          ? "bg-red-500 text-white"
                          : "bg-white text-indigo-700 hover:bg-indigo-50"
                      )}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4 mr-1" />
                      ) : (
                        <Mic className="w-4 h-4 mr-1" />
                      )}
                      {isListening ? "Stop listening" : "Tap to speak"}
                    </button>
                    <button
                      type="button"
                      onClick={clearConversation}
                      className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder="Or type your message..."
                      className="flex-1 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/60"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!textInput.trim() || isStreaming}
                      className={clsx(
                        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold",
                        !textInput.trim() || isStreaming
                          ? "bg-white/20 text-white/60 cursor-not-allowed"
                          : "bg-white text-indigo-700 hover:bg-indigo-50"
                      )}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}