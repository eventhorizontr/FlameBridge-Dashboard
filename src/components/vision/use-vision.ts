"use client";

import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import type { VisionContours, VisionVideo } from "@/types/vision";

/* ------------------------------------------------------------------ fetching */

type Load<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "absent" };

const cache = new Map<string, Promise<unknown | null>>();

function fetchJson<T>(url: string): Promise<T | null> {
  let pending = cache.get(url) as Promise<T | null> | undefined;
  if (!pending) {
    pending = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null);
    cache.set(url, pending);
  }
  return pending;
}

export const visionUrl = (accession: string, videoId: string, part: "" | ".contours" = "") =>
  `/data/${accession.toLowerCase()}/vision/${videoId}${part}.json`;

export const keyframeUrl = (accession: string, file: string) => `/data/${accession.toLowerCase()}/vision/frames/${file}`;

function useJson<T>(url: string | null): Load<T> {
  const [state, setState] = useState<{ url: string | null; load: Load<T> }>({ url, load: { status: "loading" } });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    void fetchJson<T>(url).then((data) => {
      if (alive) setState({ url, load: data ? { status: "ready", data } : { status: "absent" } });
    });
    return () => {
      alive = false;
    };
  }, [url]);
  if (!url) return { status: "absent" };
  return state.url === url ? state.load : { status: "loading" };
}

/** The stored analysis of one video (null id ⇒ absent). */
export function useVisionVideo(accession: string, videoId: string | null | undefined): Load<VisionVideo> {
  return useJson<VisionVideo>(videoId ? visionUrl(accession, videoId) : null);
}

/** Flame polygons, fetched only when a mode needs them. */
export function useVisionContours(accession: string, videoId: string | null | undefined, enabled: boolean): Load<VisionContours> {
  return useJson<VisionContours>(enabled && videoId ? visionUrl(accession, videoId, ".contours") : null);
}

/* ------------------------------------------------------- playback time sync */

/**
 * Current media time of the flame viewer, published ~10×/s so charts can draw a playhead without
 * putting a 60 Hz value through the undoable dashboard store.
 */
interface PlaybackState {
  videoId: string | null;
  timeS: number;
  playing: boolean;
  publish: (videoId: string, timeS: number, playing: boolean) => void;
}

export const playbackStore = createStore<PlaybackState>()((set) => ({
  videoId: null,
  timeS: 0,
  playing: false,
  publish: (videoId, timeS, playing) => set({ videoId, timeS, playing }),
}));

export function usePlayback<T>(selector: (s: PlaybackState) => T): T {
  return useStore(playbackStore, selector);
}
