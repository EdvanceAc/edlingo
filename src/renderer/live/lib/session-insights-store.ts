import { create } from "zustand";

export type VolumeSample = {
  t: number; // epoch ms
  mic: number; // user input volume (0..~1)
  out: number; // assistant output volume (0..~1)
};

export type SpeakingNow = "user" | "assistant" | "none";

const MAX_SAMPLES = 240; // ~60s at 250ms sampling
const MIC_TALK_THRESHOLD = 0.02;
const OUT_TALK_THRESHOLD = 0.02;

type SessionInsightsState = {
  micVolume: number;
  outVolume: number;
  speakingNow: SpeakingNow;
  lastUserStartAt: number | null;
  lastUserStopAt: number | null;
  lastAssistantStartAt: number | null;
  lastAssistantStopAt: number | null;
  samples: VolumeSample[];
  setMicVolume: (v: number) => void;
  setOutVolume: (v: number) => void;
  addSample: (s: VolumeSample) => void;
  reset: () => void;
};

export const useSessionInsightsStore = create<SessionInsightsState>((set, get) => ({
  micVolume: 0,
  outVolume: 0,
  speakingNow: "none",
  lastUserStartAt: null,
  lastUserStopAt: null,
  lastAssistantStartAt: null,
  lastAssistantStopAt: null,
  samples: [],
  setMicVolume: (v: number) => {
    const state = get();
    const now = Date.now();
    const prevSpeaking = state.speakingNow;
    const isTalking = v >= MIC_TALK_THRESHOLD;

    let speakingNow: SpeakingNow = state.speakingNow;
    let lastUserStartAt = state.lastUserStartAt;
    let lastUserStopAt = state.lastUserStopAt;

    if (isTalking) {
      if (prevSpeaking !== "user") {
        speakingNow = "user";
        lastUserStartAt = now;
      } else {
        speakingNow = "user";
      }
      lastUserStopAt = null;
    } else {
      // quiet
      if (prevSpeaking === "user") {
        lastUserStopAt = now;
      }
      // if assistant is speaking, keep state; otherwise set none
      if (state.outVolume >= OUT_TALK_THRESHOLD) {
        speakingNow = "assistant";
      } else {
        speakingNow = "none";
      }
    }

    set({ micVolume: v, speakingNow, lastUserStartAt, lastUserStopAt });
  },
  setOutVolume: (v: number) => {
    const state = get();
    const now = Date.now();
    const prevSpeaking = state.speakingNow;
    const isTalking = v >= OUT_TALK_THRESHOLD;

    let speakingNow: SpeakingNow = state.speakingNow;
    let lastAssistantStartAt = state.lastAssistantStartAt;
    let lastAssistantStopAt = state.lastAssistantStopAt;

    if (isTalking) {
      if (prevSpeaking !== "assistant") {
        speakingNow = "assistant";
        lastAssistantStartAt = now;
      } else {
        speakingNow = "assistant";
      }
      lastAssistantStopAt = null;
    } else {
      if (prevSpeaking === "assistant") {
        lastAssistantStopAt = now;
      }
      // if user is speaking, keep state; otherwise set none
      if (state.micVolume >= MIC_TALK_THRESHOLD) {
        speakingNow = "user";
      } else {
        speakingNow = "none";
      }
    }

    set({ outVolume: v, speakingNow, lastAssistantStartAt, lastAssistantStopAt });
  },
  addSample: (s: VolumeSample) => {
    const samples = get().samples;
    const next = [...samples, s].slice(-(MAX_SAMPLES));
    set({ samples: next });
  },
  reset: () => set({
    micVolume: 0,
    outVolume: 0,
    speakingNow: "none",
    lastUserStartAt: null,
    lastUserStopAt: null,
    lastAssistantStartAt: null,
    lastAssistantStopAt: null,
    samples: [],
  }),
}));