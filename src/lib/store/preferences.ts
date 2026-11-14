/**
 * Per-viewer preferences that are NOT dashboard actions (the AI must not switch its own
 * provider). Persisted in localStorage; safe when storage is unavailable.
 */
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AiProviderId } from "@/types/ai";

export interface Preferences {
  /** null = use the server default (`AI_DEFAULT_PROVIDER`). */
  aiProvider: AiProviderId | null;
  setAiProvider: (provider: AiProviderId | null) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
});

export const preferencesStore = createStore<Preferences>()(
  persist(
    (set) => ({
      aiProvider: null,
      setAiProvider: (aiProvider) => set({ aiProvider }),
    }),
    { name: "fif:preferences:v1", storage: safeStorage, skipHydration: true },
  ),
);
