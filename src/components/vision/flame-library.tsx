"use client";

import { Flame, ScanEye } from "lucide-react";
import { useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui";
import { useDispatch } from "@/lib/store";

import { formatTime } from "./time-chart";

export interface LibraryEntry {
  experimentId: string;
  testId: string;
  principalInvestigator: string;
  material: string | null;
  geometry: string | null;
  fuelRaw: string;
  o2Pct: number | null;
  airflowCmS: number | null;
  videoId: string;
  visibleS: number;
  peakAreaPx: number | null;
  peakAreaS: number | null;
  keyframes: { file: string; tileW: number; tileH: number; cols: number; rows: number; t: number[] } | null;
  /** Peak frame cropped around the flame (pipeline/vision/build.py --posters). */
  poster: { file: string; t: number } | null;
}

type SortKey = "visible" | "peak" | "o2";

function Sprite({ e, tile, accession }: { e: LibraryEntry; tile: number; accession: string }) {
  const k = e.keyframes!;
  const col = tile % k.cols;
  const row = Math.floor(tile / k.cols);
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-no-repeat transition-[background-position] duration-0"
      style={{
        backgroundImage: `url(/data/${accession.toLowerCase()}/vision/frames/${k.file})`,
        backgroundSize: `${k.cols * 100}% ${k.rows * 100}%`,
        backgroundPosition: `${(col / Math.max(1, k.cols - 1)) * 100}% ${(row / Math.max(1, k.rows - 1)) * 100}%`,
      }}
    />
  );
}

function Card({ e, accession, onOpen }: { e: LibraryEntry; accession: string; onOpen: () => void }) {
  const k = e.keyframes;
  const peakTile = k && e.peakAreaS != null ? k.t.reduce((b, t, i) => (Math.abs(t - e.peakAreaS!) < Math.abs(k.t[b] - e.peakAreaS!) ? i : b), 0) : 5;
  const [tile, setTile] = useState(peakTile);
  const [timer, setTimer] = useState<number | null>(null);
  const start = () => {
    if (!k || timer !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    setTimer(window.setInterval(() => setTile((i = (i + 1) % k.t.length)), 260));
  };
  const stop = () => {
    if (timer !== null) window.clearInterval(timer);
    setTimer(null);
    setTile(peakTile);
  };
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group text-left rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden hover:border-[var(--flame-edge)] focus-visible:border-[var(--flame-edge)] transition-colors cursor-pointer"
      aria-label={`Open run ${e.testId} in the flame viewer`}
    >
      <span className="relative block w-full bg-[var(--bg)]" style={{ aspectRatio: "3 / 2" }}>
        {e.poster && timer === null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/data/${accession.toLowerCase()}/vision/frames/${e.poster.file}`}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : k ? (
          <Sprite e={e} tile={tile} accession={accession} />
        ) : (
          <ScanEye className="absolute inset-0 m-auto size-6 text-[var(--text-3)]" />
        )}
        <span className="num absolute left-1.5 top-1.5 rounded-[var(--radius-sm)] bg-[rgb(6_9_15/0.78)] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--text-1)]">
          {e.testId}
        </span>
        {(e.poster || k) && (
          <span className="num absolute right-1.5 bottom-1.5 rounded-[var(--radius-sm)] bg-[rgb(6_9_15/0.78)] px-1.5 py-0.5 text-[0.625rem] text-[var(--text-2)]">
            {e.poster && timer === null ? `peak ${formatTime(e.poster.t)}` : k ? formatTime(k.t[tile]) : ""}
          </span>
        )}
      </span>
      <span className="block space-y-1 p-2.5">
        <span className="block truncate text-[0.75rem] text-[var(--text-1)]">{e.fuelRaw}</span>
        <span className="num flex flex-wrap gap-x-2 text-[0.6875rem] text-[var(--text-2)]">
          <span>{e.principalInvestigator}</span>
          <span>{e.o2Pct != null ? `${e.o2Pct}% O₂` : "O₂ —"}</span>
          <span>{e.airflowCmS != null ? `${e.airflowCmS} cm/s` : "flow —"}</span>
        </span>
        <span className="num flex items-center gap-1.5 text-[0.6875rem] text-[var(--text-3)]">
          <Flame className="size-3 text-[var(--flame-edge)]" aria-hidden="true" />
          {e.visibleS.toFixed(0)} s visible · peak {e.peakAreaPx != null ? `${e.peakAreaPx.toLocaleString("en-US")} px` : "—"}
        </span>
      </span>
    </button>
  );
}

/**
 * Runs gallery: every run whose primary footage the vision layer measured, shown by its peak
 * flame. Filtering is done by the Runs filters; this only sorts and lays out. Hover plays the
 * 12-frame keyframe strip.
 */
export function FlameLibrary({ entries, accession = "PSI-25" }: { entries: LibraryEntry[]; accession?: string }) {
  const dispatch = useDispatch();
  const [sort, setSort] = useState<SortKey>("visible");

  const shown = useMemo(() => {
    const key = (e: LibraryEntry) => (sort === "visible" ? e.visibleS : sort === "peak" ? e.peakAreaPx ?? -1 : e.o2Pct ?? -1);
    return [...entries].sort((a, b) => key(b) - key(a));
  }, [entries, sort]);

  return (
    <section id="flame-library" aria-label="Flame gallery" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.75rem] text-[var(--text-3)]">Peak flame of each measured run · hover to play · areas in px of the 720×480 frame</p>
        <SegmentedControl<SortKey>
          ariaLabel="Sort flames"
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: "visible", label: "Longest burn" },
            { value: "peak", label: "Largest flame" },
            { value: "o2", label: "Highest O₂" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
        {shown.map((e) => (
          <Card key={e.experimentId} e={e} accession={accession} onOpen={() => dispatch({ type: "openExperiment", id: e.experimentId })} />
        ))}
      </div>
    </section>
  );
}
