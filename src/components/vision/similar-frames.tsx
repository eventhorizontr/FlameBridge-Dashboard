"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Button, SegmentedControl } from "@/components/ui";
import type { FrameGallery } from "@/types/ai";

import { FrameGalleryGrid } from "./frame-gallery";
import { formatTime } from "./time-chart";

type State = { status: "idle" } | { status: "loading" } | { status: "ready"; gallery: FrameGallery } | { status: "error"; message: string };

/** "Frames like this one": DINOv2 search over every analysed ISS video, from the current moment. */
export function SimilarFrames({ videoId, timeS }: { videoId: string; timeS: number }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [scope, setScope] = useState<"other-runs" | "all">("other-runs");

  const search = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/vision/similar?video=${videoId}&t=${timeS.toFixed(2)}&k=18&scope=${scope}`);
      const body = (await res.json()) as FrameGallery | { error: string };
      setState("error" in body ? { status: "error", message: body.error } : { status: "ready", gallery: body });
    } catch {
      setState({ status: "error", message: "Search failed — try again." });
    }
  };

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[0.8125rem] font-medium text-[var(--text-1)]">Frames like this one</p>
          <p className="text-[0.6875rem] text-[var(--text-3)]">
            Contextual search of the flame at {formatTime(timeS)} (the playhead if the flame is visible there, else the peak)
            against every analysed ISS video — DINOv2 embeddings of flame crops.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<"other-runs" | "all">
            ariaLabel="Search scope"
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: "other-runs", label: "Other runs" },
              { value: "all", label: "All runs" },
            ]}
          />
          <Button size="sm" variant="primary" onClick={search} disabled={state.status === "loading"}>
            <Search className="size-3.5" aria-hidden="true" />
            <span>{state.status === "loading" ? "Searching…" : "Find similar frames"}</span>
          </Button>
        </div>
      </div>
      {state.status === "ready" && <FrameGalleryGrid gallery={state.gallery} />}
      {state.status === "error" && <p className="text-[0.75rem] text-[var(--warning)]">{state.message}</p>}
      <p className="text-[0.6875rem] text-[var(--text-3)]">
        Similarity is visual likeness of the flame crops, not a physical equivalence of the burns. Ask the Research AI
        “show me frames like this one” to get the same search in the conversation.
      </p>
    </div>
  );
}
