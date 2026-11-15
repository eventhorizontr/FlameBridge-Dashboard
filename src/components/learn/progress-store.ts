/**
 * Learner progress for the Explore & Learn track. Per-viewer convenience state only: it lives in
 * this browser's localStorage, is not a dashboard action (ADR-007) and is safe when storage is
 * unavailable (private windows, blocked site data).
 */
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CompletedMap } from "./progress";

export interface LearnProgress {
  completed: CompletedMap;
  /** Badge the learner just earned, used once to play the ignite animation. */
  justEarned: string | null;
  recordPass: (moduleId: string, score: number, total: number) => void;
  clearJustEarned: () => void;
  reset: () => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const storage = window.localStorage;
    const probe = "__fif_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
});

export const learnProgressStore = createStore<LearnProgress>()(
  persist(
    (set, get) => ({
      completed: {},
      justEarned: null,
      recordPass: (moduleId, score, total) => {
        const prior = get().completed[moduleId];
        if (prior && prior.score >= score) return;
        set({
          completed: {
            ...get().completed,
            [moduleId]: { score, total, passedAt: prior?.passedAt ?? new Date().toISOString() },
          },
          justEarned: prior ? null : moduleId,
        });
      },
      clearJustEarned: () => set({ justEarned: null }),
      reset: () => set({ completed: {}, justEarned: null }),
    }),
    {
      name: "fif:learn-progress:v2",
      storage: safeStorage,
      skipHydration: true,
      partialize: (state) => ({ completed: state.completed }),
    },
  ),
);
