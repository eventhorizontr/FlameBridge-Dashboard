"use client";

import { ScanEye } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Badge, EmptyState, EvidenceChip, Panel, PanelBody, PanelHeader, PanelTitle, Skeleton, Stat } from "@/components/ui";
import { useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";
import type { VisionVideo } from "@/types/vision";

import { formatTime, smooth, TimeChart, useWidth, type Band } from "./time-chart";
import { keyframeUrl, usePlayback, useVisionVideo } from "./use-vision";

/** Contiguous runs where `on(i)` holds, as time bands. */
function runs(t: readonly number[], on: (i: number) => boolean, tone: Band["tone"]): Band[] {
  const out: Band[] = [];
  let start = -1;
  for (let i = 0; i <= t.length; i++) {
    const active = i < t.length && on(i);
    if (active && start < 0) start = i;
    if (!active && start >= 0) {
      out.push({ startS: t[start], endS: t[Math.min(i, t.length - 1)], tone });
      start = -1;
    }
  }
  return out;
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(v >= 0.995 && v < 1 ? 1 : 0)} %`);

export function FlameAnalytics({ experiment }: { experiment: Experiment }) {
  const dispatch = useDispatch();
  const playingVideo = usePlayback((s) => s.videoId);
  const playheadS = usePlayback((s) => s.timeS);
  const ownVideoIds = useMemo(() => new Set(experiment.videos.map((v) => v.id)), [experiment.videos]);
  const fallbackVideo =
    experiment.videos.find((v) => v.kind === "primary") ?? experiment.videos.find((v) => v.kind === "still-sequence") ?? null;
  const videoId = playingVideo && ownVideoIds.has(playingVideo) ? playingVideo : fallbackVideo?.id ?? null;
  const load = useVisionVideo(experiment.investigation, videoId);
  const isPlaying = playingVideo === videoId;

  const seek = (timeS: number) => {
    if (!videoId) return;
    dispatch({ type: "seekVideo", experimentId: experiment.id, videoId, timeS: Number(timeS.toFixed(2)) });
  };

  return (
    <Panel surface="surface-1">
      <PanelHeader>
        <PanelTitle
          eyebrow="Flame vision · image-derived from the ISS footage"
          title="Flame Geometry, Telemetry & Frame Similarity"
          actions={
            load.status === "ready" && load.data.status === "ok" ? (
              <Badge variant="accent" className="num">
                {load.data.algorithm.name} {load.data.algorithm.version}
              </Badge>
            ) : undefined
          }
        />
      </PanelHeader>
      <PanelBody>
        {!videoId ? (
          <EmptyState icon={<ScanEye className="size-5" />} title="No footage for this run" description="Flame vision needs at least one video of the run." />
        ) : load.status === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-48" />
          </div>
        ) : load.status === "absent" ? (
          <EmptyState
            icon={<ScanEye className="size-5" />}
            title="Vision layer not built for this video"
            description="Run pipeline/vision/build.py to analyse the footage. Nothing on this panel is estimated without it."
          />
        ) : load.data.status !== "ok" ? (
          <EmptyState
            icon={<ScanEye className="size-5" />}
            eyebrow={`Status: ${load.data.status}`}
            title="This video is not measured"
            description={load.data.reason ?? "The footage could not be analysed."}
          />
        ) : (
          <Analytics analysis={load.data} playheadS={isPlaying ? playheadS : null} onSeek={seek} accession={experiment.investigation} />
        )}
      </PanelBody>
    </Panel>
  );
}

function Analytics({
  analysis: a,
  playheadS,
  onSeek,
  accession,
}: {
  analysis: VisionVideo;
  playheadS: number | null;
  onSeek: (t: number) => void;
  accession: string;
}) {
  const s = a.series!;
  const src = a.source!;
  const ev = a.events!;
  const sum = a.summary!;
  const osd = a.osd ?? null;
  const emb = a.embedding ?? null;
  const duration = src.durationS;

  const bands = useMemo<Band[]>(
    () => [
      ...runs(s.t, (i) => s.visible[i] === 1, "flame"),
      ...runs(s.t, (i) => ((s.flags?.[i] ?? 0) & 1) !== 0, "muted"),
      ...runs(s.t, (i) => ((s.flags?.[i] ?? 0) & 2) !== 0, "warn"),
    ],
    [s],
  );

  // DINOv2 cosine resampled onto the stored time grid (it is computed at a lower rate)
  const embOnGrid = useMemo(() => {
    if (!emb) return null;
    let j = 0;
    return s.t.map((t) => {
      while (j + 1 < emb.t.length && emb.t[j + 1] <= t) j++;
      return emb.t.length && Math.abs(emb.t[j] - t) <= 1 / emb.hz + 0.05 ? emb.cosPrev[j] : null;
    });
  }, [emb, s.t]);

  const smoothWindow = Math.max(1, Math.round(a.sampling?.storeHz ?? 5));
  const iouSmooth = useMemo(() => smooth(s.iou, smoothWindow), [s.iou, smoothWindow]);
  const flowSmooth = useMemo(() => smooth(s.flowPxS, smoothWindow), [s.flowPxS, smoothWindow]);
  const rad = osd?.series.rad ?? null;
  const air = osd?.series.air ?? null;
  const dateStatus = osd?.dateCheck.status;
  const minRead = osd ? Math.min(...Object.values(osd.readRate)) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="First flame" value={ev.firstFlameS} unit="s" precision={1} nullReason="No flame detected" />
        <Stat label="Flame visible" value={ev.visibleS} unit="s" precision={1} delta={ev.episodes > 1 ? `${ev.episodes} episodes` : undefined} />
        <Stat
          label="Peak area"
          value={ev.peakAreaPx}
          unit="px"
          precision={0}
          delta={ev.peakAreaS != null ? `@ ${formatTime(ev.peakAreaS)}` : undefined}
          nullReason="No flame detected"
        />
        <Stat
          label="Largest frame"
          value={sum.maxBBoxW != null && sum.maxBBoxH != null ? `${sum.maxBBoxW}×${sum.maxBBoxH}` : null}
          unit="px"
          nullReason="No flame detected"
        />
        <Stat
          label="Area oscillation"
          value={sum.dominantFlickerHz?.hz ?? null}
          unit="Hz"
          precision={2}
          nullReason="No dominant periodicity (≥ 15 % of variance) in the longest burn"
        />
        <Stat
          label="Overlay OCR"
          value={minRead != null ? pct(minRead) : null}
          delta={dateStatus === "match" ? "date ✓" : dateStatus === "mismatch" ? "date ≠ matrix" : undefined}
          nullReason="No telemetry overlay in this footage"
        />
      </div>

      {a.keyframes && <Filmstrip a={a} accession={accession} playheadS={playheadS} onSeek={onSeek} />}

      <div className="grid gap-x-6 gap-y-5 xl:grid-cols-2">
        <TimeChart
          title="Flame area"
          unit="px of the 720×480 frame"
          t={s.t}
          durationS={duration}
          playheadS={playheadS}
          onSeek={onSeek}
          bands={bands}
          series={[
            { key: "area", label: "Flame", color: "var(--series-2)", values: s.areaPx },
            { key: "core", label: "Luminous core", color: "var(--series-4)", values: s.corePx },
          ]}
        />
        <TimeChart
          title="Bounding frame"
          unit="px"
          t={s.t}
          durationS={duration}
          playheadS={playheadS}
          onSeek={onSeek}
          bands={bands}
          series={[
            { key: "w", label: "Width", color: "var(--series-1)", values: s.bboxW },
            { key: "h", label: "Height", color: "var(--series-3)", values: s.bboxH },
          ]}
        />
        {rad && (
          <TimeChart
            title="Radiometer (RAD, overlay)"
            unit="uncalibrated display units"
            t={s.t}
            durationS={duration}
            playheadS={playheadS}
            onSeek={onSeek}
            bands={bands}
            series={[{ key: "rad", label: "RAD", color: "var(--series-5)", values: rad }]}
            note="Relative flame intensity; the radiometer gain was changed between tests to avoid saturation (BASS-II ReadMe)."
          />
        )}
        {air && (
          <TimeChart
            title="Duct air flow (AIR, overlay)"
            unit="cm/s"
            t={s.t}
            durationS={duration}
            playheadS={playheadS}
            onSeek={onSeek}
            bands={bands}
            series={[{ key: "air", label: "AIR", color: "var(--series-1)", values: air }]}
            note="Measured duct velocity read from the video overlay; the sensor responds slowly (~1 min)."
          />
        )}
        <TimeChart
          title="Frame-to-frame similarity"
          unit="0–1"
          t={s.t}
          durationS={duration}
          playheadS={playheadS}
          onSeek={onSeek}
          bands={bands}
          yDomain={[0, 1]}
          series={[
            { key: "ssim", label: "SSIM", color: "var(--series-1)", values: s.ssim },
            { key: "iou", label: "Mask IoU (1 s mean)", color: "var(--series-2)", values: iouSmooth },
            ...(embOnGrid ? [{ key: "emb", label: "DINOv2 cosine", color: "var(--series-3)", values: embOnGrid }] : []),
          ]}
          note="SSIM: picture structure. Mask IoU: does the flame keep its shape and place? DINOv2: whole-scene context."
        />
        <TimeChart
          title="Flame motion"
          unit="px/s (optical flow inside the flame)"
          t={s.t}
          durationS={duration}
          playheadS={playheadS}
          onSeek={onSeek}
          bands={bands}
          series={[{ key: "flow", label: "Motion (1 s mean)", color: "var(--series-4)", values: flowSmooth }]}
        />
      </div>

      {emb && <Recurrence a={a} playheadS={playheadS} onSeek={onSeek} />}

      <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-[var(--text-3)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--flame-edge)] opacity-40" aria-hidden="true" /> flame visible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--warning)] opacity-50" aria-hidden="true" /> transient glow (excluded from peaks)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--text-3)] opacity-50" aria-hidden="true" /> chamber lit, not measured
        </span>
      </div>

      <details className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[0.75rem] text-[var(--text-2)]">
        <summary className="cursor-pointer text-[var(--text-1)]">Method, units and limits</summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p>
            Each frame is compared with a per-video background (25th percentile of {">"}60 sampled frames). Pixels clearly brighter
            than the scene (noise σ {a.segmentation?.noiseSigma} counts; thresholds {a.segmentation?.weakThreshold} /{" "}
            {a.segmentation?.strongThreshold}) form the flame when they belong to a luminous core or a large dim region (the blue
            zone near extinction). Light thrown on chamber walls is dropped by a distance rule; frames with cabin lights on are
            not measured. Areas are pixels — the footage has no visible scale, so nothing is converted to millimetres. The mask
            includes the ~2 px blurred fringe of bright edges, so compact flames read up to ~15–20 % large; every run is measured
            the same way.
          </p>
          <p>
            AIR, FAN and RAD are read from the camera overlay by a CNN trained only on labels the data itself provides (test-matrix
            dates and clock continuity); unreadable cells stay empty. Coverage: {pct(a.coverage?.instrumentFraction)} of sampled
            frames are instrument-camera frames.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <EvidenceChip id="doi:10.1016/j.firesaf.2017.03.039" label="Image-based spread measurement" kind="publication" href="https://doi.org/10.1016/j.firesaf.2017.03.039" detail="Bhattacharjee et al., Fire Safety Journal (2017) — precedent for measuring flames from BASS imagery." />
            <EvidenceChip id="doi:10.1109/TIP.2003.819861" label="SSIM" kind="publication" href="https://doi.org/10.1109/TIP.2003.819861" detail="Wang, Bovik, Sheikh & Simoncelli, IEEE TIP 13(4):600–612 (2004)." />
            <EvidenceChip id="arxiv:2304.07193" label="DINOv2" kind="publication" href="https://arxiv.org/abs/2304.07193" detail="Oquab et al., DINOv2: Learning Robust Visual Features without Supervision, TMLR (2024)." />
            <EvidenceChip id={`vision:${a.videoId}`} label="Raw analysis JSON" kind="file" href={`/api/vision/${a.videoId}?full=1`} detail={`${a.fileName ?? a.videoId} · ${src.width}×${src.height} @ ${src.fps.toFixed(2)} fps`} />
          </div>
        </div>
      </details>
    </div>
  );
}

function Filmstrip({ a, accession, playheadS, onSeek }: { a: VisionVideo; accession: string; playheadS: number | null; onSeek: (t: number) => void }) {
  const k = a.keyframes!;
  const url = keyframeUrl(accession, k.file);
  const active = playheadS == null ? -1 : k.t.reduce((best, t, i) => (Math.abs(t - playheadS) < Math.abs(k.t[best] - playheadS) ? i : best), 0);
  return (
    <div className="space-y-1.5">
      <p className="text-[0.75rem] text-[var(--text-2)]">Keyframes across the flame-visible span — click to jump</p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
        {k.t.map((t, i) => {
          const col = i % k.cols;
          const row = Math.floor(i / k.cols);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(t)}
              aria-label={`Jump to ${formatTime(t)}`}
              className={`group relative overflow-hidden rounded-[var(--radius-sm)] border bg-[var(--bg)] cursor-pointer ${
                i === active ? "border-[var(--flame-edge)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"
              }`}
              style={{ aspectRatio: `${k.tileW} / ${k.tileH}` }}
            >
              <span
                className="absolute inset-0 bg-no-repeat"
                style={{
                  backgroundImage: `url(${url})`,
                  backgroundSize: `${k.cols * 100}% ${k.rows * 100}%`,
                  backgroundPosition: `${(col / Math.max(1, k.cols - 1)) * 100}% ${(row / Math.max(1, k.rows - 1)) * 100}%`,
                }}
              />
              <span className="num absolute bottom-0 left-0 right-0 bg-[rgb(6_9_15/0.7)] px-1 text-[0.625rem] text-[var(--text-2)]">
                {formatTime(t)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Recurrence({ a, playheadS, onSeek }: { a: VisionVideo; playheadS: number | null; onSeek: (t: number) => void }) {
  const emb = a.embedding!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const n = emb.recurrence.size;
  const size = Math.min(280, Math.max(160, width));
  const starts = emb.recurrence.binStartS;
  const duration = a.source!.durationS;
  const binAt = (t: number) => {
    let k = 0;
    while (k + 1 < starts.length && starts[k + 1] <= t) k++;
    return k;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = ctx.createImageData(n, n);
    // display: histogram equalisation (each cell coloured by its rank), the usual treatment for
    // recurrence plots whose values crowd near 1; then a single-hue ramp: dark surface -> flame tone
    const values = emb.recurrence.values;
    const counts = new Array<number>(256).fill(0);
    for (const v of values) counts[v] += 1;
    const cdf = new Array<number>(256).fill(0);
    let acc = 0;
    for (let k = 0; k < 256; k++) {
      acc += counts[k];
      cdf[k] = acc / values.length;
    }
    for (let i = 0; i < n * n; i++) {
      const v = cdf[values[i]];
      image.data[i * 4] = Math.round(11 + v * (255 - 11));
      image.data[i * 4 + 1] = Math.round(16 + v * (138 - 16));
      image.data[i * 4 + 2] = Math.round(25 + v * (61 - 25));
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [emb, n]);

  const playBin = playheadS == null ? null : binAt(playheadS);
  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr] items-start">
      <div ref={boxRef} className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={n}
          height={n}
          role="img"
          aria-label="Recurrence matrix of DINOv2 frame embeddings; bright cells are moments that look alike. Click to seek."
          className="size-full cursor-crosshair rounded-[var(--radius-sm)] border border-[var(--line)] [image-rendering:pixelated]"
          onPointerDown={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const k = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * n)));
            onSeek(starts[k] ?? 0);
          }}
        />
        {playBin != null && (
          <>
            <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--text-1)]" style={{ left: `${((playBin + 0.5) / n) * 100}%` }} />
            <span className="pointer-events-none absolute left-0 right-0 h-px bg-[var(--text-1)]" style={{ top: `${((playBin + 0.5) / n) * 100}%` }} />
          </>
        )}
      </div>
      <div className="space-y-2 text-[0.75rem] text-[var(--text-2)]">
        <p className="text-[0.8125rem] font-medium text-[var(--text-1)]">Contextual similarity map (DINOv2)</p>
        <p>
          Every cell compares two moments of the video by their self-supervised embedding: bright = the scene looks alike, dark =
          it changed. Square blocks on the diagonal are stable phases; the borders between them are where the run changed state.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {emb.segments.map((seg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(seg.startS)}
              className="num inline-flex min-h-7 items-center rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-2 text-[0.6875rem] text-[var(--text-1)] hover:border-[var(--flame-edge)] cursor-pointer"
            >
              Phase {i + 1}: {formatTime(seg.startS)}–{formatTime(Math.min(seg.endS, duration))}
            </button>
          ))}
        </div>
        <p className="text-[0.6875rem] text-[var(--text-3)]">
          Colours are histogram-equalised for display (rank of each similarity). Phases are found by a
          checkerboard-kernel novelty detector on this matrix (Foote, 2000); they are image phases, not physical stages,
          and are labelled only by time.
        </p>
      </div>
    </div>
  );
}
