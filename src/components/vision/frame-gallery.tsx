"use client";

import { useDispatch } from "@/lib/store";
import { routeForExperiment } from "@/lib/store/actions";
import type { FrameGallery, FrameMatch } from "@/types/ai";

import { formatTime } from "./time-chart";

function Thumb({ m, accession }: { m: FrameMatch; accession: string }) {
  const col = m.thumb.index % m.thumb.cols;
  const row = Math.floor(m.thumb.index / m.thumb.cols);
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-no-repeat"
      style={{
        backgroundImage: `url(/data/${accession.toLowerCase()}/vision/frames/${m.thumb.sheet})`,
        backgroundSize: `${m.thumb.cols * 100}% ${m.thumb.rows * 100}%`,
        backgroundPosition: `${(col / Math.max(1, m.thumb.cols - 1)) * 100}% ${(row / Math.max(1, m.thumb.rows - 1)) * 100}%`,
      }}
    />
  );
}

/**
 * Clickable gallery of similar frames: each tile opens its run and seeks the footage to that
 * second. Used in the assistant answer and in the flame analytics panel.
 */
export function FrameGalleryGrid({ gallery, accession = "PSI-25", compact = false }: { gallery: FrameGallery; accession?: string; compact?: boolean }) {
  const dispatch = useDispatch();
  const open = (m: FrameMatch) => {
    dispatch({ type: "navigate", route: routeForExperiment(m.experimentId) });
    dispatch({ type: "seekVideo", experimentId: m.experimentId, videoId: m.videoId, timeS: m.timeS });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div
          className="relative shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--flame-edge)]"
          style={{ width: compact ? 72 : 96, aspectRatio: `${gallery.query.thumb.tileW} / ${gallery.query.thumb.tileH}` }}
        >
          <Thumb m={gallery.query} accession={accession} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[0.75rem] font-medium text-[var(--text-1)]">{gallery.title}</p>
          <p className="text-[0.6875rem] leading-snug text-[var(--text-3)]">{gallery.method}</p>
        </div>
      </div>
      <div className={`grid gap-1.5 ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"}`}>
        {gallery.frames.map((m) => (
          <button
            key={`${m.videoId}-${m.timeS}`}
            type="button"
            onClick={() => open(m)}
            title={`Open ${m.testId} at ${formatTime(m.timeS)}`}
            className="group relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg)] text-left hover:border-[var(--flame-edge)] cursor-pointer"
            style={{ aspectRatio: `${m.thumb.tileW} / ${m.thumb.tileH}` }}
          >
            <Thumb m={m} accession={accession} />
            <span className="num absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-[rgb(6_9_15/0.78)] px-1 text-[0.625rem] text-[var(--text-1)]">
              <span className="truncate">
                {m.testId} · {formatTime(m.timeS)}
              </span>
              <span className="text-[var(--flame-edge)]">{m.similarity.toFixed(2)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
