/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { LiveConnectConfig, Modality, Tool, FunctionDeclaration, Type } from "@google/genai";
import { useSessionInsightsStore } from "../lib/session-insights-store";

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

// Default System Instructions restored (EdLingo tutor, level-aware guidance)
const DEFAULT_SYSTEM_INSTRUCTION = `You are an AI language tutor in the EdLingo app, designed to teach English based on a unified proficiency system combining Flesch-Kincaid readability and CEFR levels. Your goal is to communicate effectively with users by adapting your responses to their assigned grade level. Always assess the user's level first and tailor your language, explanations, examples, and questions accordingly. Do not overwhelm beginners or bore advanced learners—keep interactions engaging, supportive, and progressive.

- Identify user level or ask for it politely.
- Keep responses concise, clear, and encouraging.
- Correct mistakes gently and focus on one issue at a time.
- End with a follow-up question or short task to practice.
- Avoid using functions unless the user explicitly asks for an action (e.g., schedule a session, translate text).`;

// Default Function Declarations (for Settings UI and optional tool use)
const DEFAULT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "schedule_practice_session",
    description: "Schedule a practice session with topic, level, and duration.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        level: {
          type: Type.STRING,
          enum: [
            "Basic",
            "Elementary",
            "Pre-Intermediate",
            "Intermediate",
            "Upper-Intermediate",
            "Advanced",
          ],
        },
        duration_min: { type: Type.INTEGER, minimum: 5, maximum: 120 },
      },
      required: ["topic", "duration_min"],
    },
  },
  {
    name: "record_progress",
    description: "Record user progress for a skill with score and optional notes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        skill: {
          type: Type.STRING,
          enum: ["speaking", "listening", "grammar", "vocabulary", "pronunciation"],
        },
        score: { type: Type.NUMBER, minimum: 0, maximum: 100 },
        notes: { type: Type.STRING },
      },
      required: ["skill", "score"],
    },
  },
  {
    name: "translate_text",
    description: "Translate text to a target language.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        target_language: { type: Type.STRING },
      },
      required: ["text", "target_language"],
    },
  },
  {
    name: "fetch_dictionary_definition",
    description: "Get dictionary definition for a word.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING },
      },
      required: ["word"],
    },
  },
];

const DEFAULT_TOOLS: Tool[] = [
  {
    functionDeclarations: DEFAULT_FUNCTION_DECLARATIONS,
  } as Tool,
];

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);


  // Use an audio-capable Live model by default so the server returns PCM audio
  // Choose widely-available EXP model for stability
  const [model, setModel] = useState<string>(
    "models/gemini-2.5-flash-exp"
  );
  const [config, setConfig] = useState<LiveConnectConfig>({
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    tools: DEFAULT_TOOLS,
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: "Zephyr" },
      },
    },
  });
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<(ev: MessageEvent<{ volume: number }>) => void>("vumeter-out", VolMeterWorket, (ev: MessageEvent<{ volume: number }>) => {
            setVolume(ev.data.volume);
            try {
              const v = ev.data.volume as number;
              const { setOutVolume } = useSessionInsightsStore.getState();
              setOutVolume(v);
            } catch {
              void 0;
            }
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
      // Ensure audio context is resumed on user-initiated connect (mobile browsers)
      try {
        audioStreamerRef.current?.resume();
      } catch {
        // no-op
      }
    };

    const onClose = () => {
      setConnected(false);
    };

    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    // Guard: require API key for Live connection to succeed (avoids opaque 403)
    const hasKey = Boolean((client as any)?.['client']?.options?.apiKey) || Boolean((options as any)?.apiKey);
    if (!hasKey) {
      throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY or VITE_GOOGLE_GEMINI_API_KEY.");
    }
    client.disconnect();
    await client.connect(model, config);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}
