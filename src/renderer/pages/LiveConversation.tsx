import { useRef, useState } from "react";
import "../live/App.scss";
import { LiveAPIProvider } from "../live/contexts/LiveAPIContext";
import { useLiveAPIContext } from "../live/contexts/LiveAPIContext";
// SidePanel hidden per UI requirement


import ControlTray from "../live/components/control-tray/ControlTray";
import clsx from "clsx";
import { LiveClientOptions } from "../live/types";
import { motion } from "framer-motion";
import { Mic, Settings, Info } from "lucide-react";

// Read Gemini API key from Vite env; if missing, UI renders but connect will fail until provided
const API_KEY = (import.meta as any).env?.VITE_GOOGLE_GEMINI_API_KEY as string | undefined;

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY || "",
};

function StatusBadge() {
  const { connected, volume } = useLiveAPIContext();
  const vol = Math.min(100, Math.round(volume * 100));
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 ring-1 ring-white/30">
      <span className={clsx("inline-block w-2 h-2 rounded-full", connected ? "bg-emerald-400" : "bg-rose-400")} />
      <span className="text-sm text-white/95">{connected ? "Connected" : "Waiting to connect"}</span>
      <div className="ml-2 w-20 h-2 rounded-full bg-white/25 overflow-hidden">
        <div style={{ width: `${vol}%` }} className="h-full bg-white/80" />
      </div>
      <Mic className="w-4 h-4 text-white/90" />
    </div>
  );
}

export default function LiveConversation() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
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
                  Practice interactive speaking with the AI assistant, improve pronunciation, and get instant feedback. Click Connect to begin.
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


              {/* Live stream & Controls */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl ring-1 ring-white/20 p-6 md:p-8 w-full max-w-3xl"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-white/90" />
                    <h2 className="text-base md:text-lg font-semibold text-white">Session Controls</h2>
                  </div>
                  <StatusBadge />
                </div>
                <div className="rounded-xl bg-white/10 ring-1 ring-white/25 p-4">
                  <div className="main-app-area">
                    <video
                      className={clsx("stream rounded-xl ring-1 ring-white/20", videoStream ? "" : "hidden")}
                      style={{ display: videoStream ? "block" : "none" }}
                      ref={videoRef}
                      autoPlay
                      playsInline
                    />
                  </div>

                  <div className="mt-3">
                    <ControlTray
                      videoRef={videoRef}
                      supportsVideo={false}
                      onVideoStreamChange={setVideoStream}
                      enableEditingSettings={true}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}