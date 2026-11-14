"use client";

import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export interface ShellUiState {
  assistantOpen: boolean;
  assistantExpanded: boolean;
  paletteOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  toggleAssistant: () => void;
  setAssistantExpanded: (expanded: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
}

/**
 * Ephemeral shell chrome state (dock open/expanded, command palette open).
 * Kept separate from `dashboardStore` because drawer visibility is local UI chrome,
 * while all scientific & navigation state remains in the AI-drivable `dashboardStore`.
 */
export const shellUiStore = createStore<ShellUiState>()((set) => ({
  assistantOpen: false,
  assistantExpanded: false,
  paletteOpen: false,
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
  setAssistantExpanded: (assistantExpanded) => set({ assistantExpanded }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
}));

export function useShellUi<T>(selector: (s: ShellUiState) => T): T {
  return useStore(shellUiStore, selector);
}
