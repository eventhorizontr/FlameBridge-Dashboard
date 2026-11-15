/**
 * Where the flame viewer currently is (video + media time), published ~10×/s by `FlameStage`.
 * Charts draw their playhead from it and the assistant sends it as `context.video`, without
 * pushing a 60 Hz value through the undoable dashboard store.
 */
import { createStore } from "zustand/vanilla";

export interface PlaybackState {
  experimentId: string | null;
  videoId: string | null;
  timeS: number;
  playing: boolean;
  publish: (experimentId: string | null, videoId: string, timeS: number, playing: boolean) => void;
}

export const playbackStore = createStore<PlaybackState>()((set) => ({
  experimentId: null,
  videoId: null,
  timeS: 0,
  playing: false,
  publish: (experimentId, videoId, timeS, playing) => set({ experimentId, videoId, timeS, playing }),
}));
