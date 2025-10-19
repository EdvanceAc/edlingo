import { useRef, useState } from "react";
import "../live/App.scss";
import { LiveAPIProvider } from "../live/contexts/LiveAPIContext";
// SidePanel hidden per UI requirement
import { Altair } from "../live/components/altair/Altair";
import ControlTray from "../live/components/control-tray/ControlTray";
import clsx from "clsx";
import { LiveClientOptions } from "../live/types";

// Read Gemini API key from Vite env; if missing, UI renders but connect will fail until provided
const API_KEY = (import.meta as any).env?.VITE_GOOGLE_GEMINI_API_KEY as string | undefined;

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY || "",
};

export default function LiveConversation() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        <div className="streaming-console">
          {/* SidePanel removed to match app UI */}
          <main>
            <div className="main-app-area">
              <Altair />
              <video
                className={clsx("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={false}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={false}
            />
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}