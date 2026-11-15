"""Analyse one video: overlay telemetry, flame geometry, frame similarity, events and keyframes.

Two passes over the file:

* **sparse** — ~120 frames spread over the video register the overlay and build the background;
* **dense** — every ``fps / sample_hz``-th frame is decoded and measured (others are only grabbed).

The result is a JSON-ready dict (see ``docs/DATA.md`` → *Vision*). Series are stored at
``profile.store_hz`` as parallel arrays; ``None`` means "not measured", never zero.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime
import math
from pathlib import Path

import cv2
import numpy as np

from osd import OsdReader, date_check
from profiles import VisionProfile
import segment as seg
import similarity as sim

ALGORITHM_VERSION = "1.3.0"
KEYFRAME_TILE = (192, 128)
KEYFRAME_COUNT = 12
EMBED_SIZE = (336, 224)  # multiples of the DINOv2 patch size (14)


@dataclass
class Registration:
    score: float
    x0: int
    y0: int
    scale: float
    yscale: float = 1.0


def _round(value: float | None, digits: int = 0):
    if value is None or (isinstance(value, float) and not math.isfinite(value)):
        return None
    return int(round(value)) if digits == 0 else round(float(value), digits)


def _read_at(cap: cv2.VideoCapture, index: int) -> np.ndarray | None:
    cap.set(cv2.CAP_PROP_POS_FRAMES, index)
    ok, frame = cap.read()
    return frame if ok else None


SQUEEZE_YSCALES = (1.0, 0.95, 0.9, 0.85, 0.8, 0.75)


def register_video(cap: cv2.VideoCapture, frames: int, reader: OsdReader, probes: int = 9) -> Registration | None:
    """Most common overlay registration among a few probe frames (None if no overlay).

    Nominal geometry first; if no probe matches well (< 0.9), vertically squeezed overlays are
    tried too (some recordings put the 4:3 picture into a 16:9 frame) and the best wins.
    """
    greys = []
    for k in range(probes):
        frame = _read_at(cap, int(frames * (k + 0.5) / probes))
        if frame is not None:
            greys.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    best: list[Registration] = []
    for yscale in SQUEEZE_YSCALES:
        found = []
        for grey in greys:
            score, x0, y0, scale = reader.register(grey, yscale=yscale)
            if score >= reader.layout.min_register_score:
                found.append(Registration(score, x0, y0, scale, yscale))
        if found and (not best or max(r.score for r in found) > max(r.score for r in best)):
            best = found
        if best and max(r.score for r in best) >= 0.9:
            break
    if not best:
        return None
    key = Counter((r.x0, r.y0, r.scale, r.yscale) for r in best).most_common(1)[0][0]
    return max((r for r in best if (r.x0, r.y0, r.scale, r.yscale) == key), key=lambda r: r.score)


def osd_box(registration: Registration | None, reader: OsdReader | None, width: int) -> tuple[int, int, int, int] | None:
    if registration is None or reader is None:
        return None
    layout = reader.layout
    top = registration.y0 - 8
    bottom = registration.y0 + int((layout.date_row * layout.row_px + 13) * registration.yscale) + 8
    left = registration.x0 - 12
    return (max(0, left), max(0, top), width - max(0, left), bottom - max(0, top))


def presence_runs(area: list[int | None], hz: float, min_area: int, min_run_s: float) -> np.ndarray:
    """Boolean "flame visible" per analysed frame: area >= min_area, gaps/blips < min_run_s removed."""
    raw = np.array([(a or 0) >= min_area for a in area], dtype=bool)
    n = max(1, int(round(min_run_s * hz)))
    out = raw.copy()
    # close short gaps, then drop short blips
    for value in (False, True):
        i = 0
        while i < len(out):
            if out[i] == value:
                j = i
                while j < len(out) and out[j] == value:
                    j += 1
                bounded = i > 0 and j < len(out)
                if j - i < n and (bounded or value):
                    out[i:j] = not value
                i = j
            else:
                i += 1
    return out


def clean_osd(series: list[float | None], min_repeat: int = 2) -> list[float | None]:
    """Drop isolated misreads: a value must be read on >= ``min_repeat`` consecutive frames."""
    out: list[float | None] = [None] * len(series)
    i = 0
    while i < len(series):
        j = i
        while j < len(series) and series[j] == series[i]:
            j += 1
        if series[i] is not None and j - i >= min_repeat:
            out[i:j] = series[i:j]
        i = j
    return out


def encode_polygons(polygons: list[np.ndarray], width: int, height: int) -> list[list[int]] | None:
    """Polygons as flat [x, y, x, y, ...] lists in permille of frame width/height (0..1000)."""
    if not polygons:
        return None
    out = []
    for poly in polygons:
        if len(poly) < 3:
            continue
        flat = []
        for x, y in poly:
            flat.append(int(round(1000 * min(max(x, 0), width) / width)))
            flat.append(int(round(1000 * min(max(y, 0), height) / height)))
        out.append(flat)
    return out or None


def analyze(path: Path, *, profile: VisionProfile, experiment: dict, video: dict,
            keyframe_path: Path | None = None, embeddings: np.ndarray | None = None,
            embedding_times: np.ndarray | None = None, embed_sink: list | None = None) -> dict:
    """``embed_sink`` (optional) collects (t, JPEG bytes) frames at ``profile.embed_hz`` with the
    overlay blanked, for the GPU embedding pass in ``embed.py``."""
    cap = cv2.VideoCapture(str(path))
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    base = {
        "schemaVersion": 1,
        "accession": profile.accession,
        "experimentId": experiment["id"],
        "videoId": video["id"],
        "kind": video.get("kind"),
        "fileName": video.get("fileName"),
        "algorithm": {"name": "fif-flame-vision", "version": ALGORITHM_VERSION},
    }
    if video.get("kind") == "second-view":
        cap.release()
        return {**base, "status": "skipped",
                "reason": "The 2nd view films the MSG monitors (a screen recording); flame geometry is measured on the primary view."}
    if frames <= 0 or fps <= 0 or width <= 0:
        cap.release()
        return {**base, "status": "unreadable", "reason": "The source MP4 could not be decoded (no index/moov atom)."}

    params = profile.segmentation
    reader = OsdReader(profile.osd) if profile.osd else None
    registration = register_video(cap, frames, reader) if reader else None
    if reader is not None and registration is None:
        if video.get("kind") == "still-sequence":
            reader = None  # Nikon still-camera slideshow: no overlay, but the flame is measurable
        else:
            cap.release()
            return {**base, "status": "not-instrument-footage",
                    "reason": "No BASS camera overlay found: this file is not instrument-camera footage "
                              "(crew/lab camera or loss-of-signal recording).",
                    "source": {"fps": round(fps, 5), "frameCount": frames, "durationS": round(frames / fps, 3),
                               "width": width, "height": height}}
    box = osd_box(registration, reader, width)
    exclude_work = seg.overlay_exclusion((height, width), box, params)
    photo_roi = None
    if video.get("kind") == "still-sequence" and profile.still_layout is not None:
        photo_roi = still_photo_roi(cap, frames, width, height, profile.still_layout)
        x0, y0, x1, y1 = (int(round(v * params.work_scale)) for v in photo_roi[1])
        keep = np.zeros_like(exclude_work)
        keep[y0:y1, x0:x1] = True
        exclude_work |= ~keep
    exclude_full = cv2.resize(exclude_work.astype(np.uint8), (width, height),
                              interpolation=cv2.INTER_NEAREST).astype(bool)

    # ---- sparse pass: background from frames that belong to the instrument camera
    samples = []
    for k in range(params.background_samples):
        frame = _read_at(cap, int(frames * (k + 0.5) / params.background_samples))
        if frame is None:
            continue
        if registration is not None:
            grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if reader.check_at(grey, registration.x0, registration.y0, registration.scale,
                               registration.yscale) < reader.layout.min_register_score:
                continue
        samples.append(seg.prepare(frame, params))
    if len(samples) < 10:
        cap.release()
        reason = ("No BASS camera overlay found: this file is not instrument-camera footage "
                  "(crew/lab camera or loss-of-signal recording).") if reader else "Too few decodable frames."
        return {**base, "status": "not-instrument-footage" if reader else "unreadable", "reason": reason,
                "source": {"fps": round(fps, 5), "frameCount": frames, "durationS": round(frames / fps, 3),
                           "width": width, "height": height}}
    background = seg.build_background(samples, exclude_work, params)
    del samples

    # ---- dense pass
    stride = max(1, int(round(fps / profile.sample_hz)))
    hz = fps / stride
    osd_every = max(1, int(round(hz / 5.0)))
    embed_every = max(1, int(round(hz / profile.embed_hz)))
    clock_every = max(osd_every, int(round(hz)))
    last_osd = None
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    rows: list[dict] = []
    polygons: list = []
    prev = None
    keyframe_source: list[tuple[int, np.ndarray]] = []
    index = 0
    while True:
        if index % stride:
            if not cap.grab():
                break
            index += 1
            continue
        ok, frame = cap.read()
        if not ok:
            break
        t = index / fps
        grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        valid = True
        osd_values: dict = {}
        clock = None
        if registration is not None:
            score = reader.check_at(grey, registration.x0, registration.y0, registration.scale, registration.yscale)
            valid = score >= reader.layout.min_register_score
            n_analysed = len(rows)
            # the overlay refreshes at 5 Hz and the clock at 1 Hz: read fields every other analysed
            # frame and the clock about once per second (gaps are forward-filled within 0.4 s)
            if valid and n_analysed % osd_every == 0:
                with_clock = n_analysed % clock_every == 0
                band, bx, by = reader.canonical(grey, registration.x0, registration.y0, registration.yscale)
                reading = reader.read(band, bx, by, score, registration.scale, with_clock)
                osd_values, clock = reading.values, reading.clock
                last_osd = (n_analysed, osd_values)
            elif valid and last_osd is not None and n_analysed - last_osd[0] < osd_every:
                osd_values = last_osd[1]
        row = {"i": index, "t": t, "valid": valid, "osd": osd_values, "clock": clock}
        if embed_sink is not None and valid and len(rows) % embed_every == 0:
            masked = frame.copy()
            masked[exclude_full] = 0
            ok_jpg, jpg = cv2.imencode(".jpg", cv2.resize(masked, EMBED_SIZE, interpolation=cv2.INTER_AREA),
                                       [cv2.IMWRITE_JPEG_QUALITY, 90])
            if ok_jpg:
                embed_sink.append((t, jpg.tobytes()))
        if valid:
            prepared = seg.prepare(frame, params)
            context, hist = sim.context_image(frame, exclude_full)
            lit = seg.lit_level(prepared, background)
            row["lit"] = lit > params.lit_threshold
            if row["lit"]:
                # cabin/work lights on: scene light swamps flame light, so nothing is measured
                m = seg.FrameMeasure(0, 0, None, None, 0.0, 0.0, 0, [], np.zeros(exclude_work.shape, bool))
            else:
                m = seg.segment(prepared, frame, background, params)
                row.update(area=m.area_px, core=m.core_px, bbox=m.bbox, centroid=m.centroid,
                           sum=m.sum_excess, peak=m.peak_excess, sat=m.saturated_px, halo=m.halo_px,
                           other=m.other_px)
            if prev is not None and prev["valid"]:
                region = sim.context_region(m.mask | prev["mask"])
                row.update(
                    ssim=sim.ssim(prev["context"], context),
                    hist=sim.hist_similarity(prev["hist"], hist),
                    iou=sim.mask_iou(prev["mask"], m.mask),
                    flow=sim.flow_speed(prev["context"], context, region,
                                        width / sim.CONTEXT_SIZE[0], (index - prev["i"]) / fps),
                )
            polygons.append(encode_polygons(m.polygons, width, height))
            prev = {"i": index, "valid": True, "mask": m.mask, "context": context, "hist": hist}
            keyframe_source.append((index, m.area_px))
        else:
            polygons.append(None)
            prev = {"i": index, "valid": False}
        rows.append(row)
        index += 1
    cap.release()

    times = [r["t"] for r in rows]
    area = [r.get("area") for r in rows]
    visible = presence_runs(area, hz, params.present_min_area_px, params.present_min_run_s)
    # gap closing must never mark an unmeasured frame (LOS, lit chamber) as "flame visible"
    visible &= np.array([r.get("area") is not None for r in rows], dtype=bool)
    valid_mask = np.array([r["valid"] for r in rows], dtype=bool)
    transient = transient_frames(area, hz, params.transient_factor, params.present_min_area_px,
                                 params.transient_min_area_px)
    for r, tr in zip(rows, transient):
        flags = 0
        if r.get("lit"):
            flags |= FLAG_LIT
        if tr:
            flags |= FLAG_TRANSIENT
        if (r.get("other") or 0) > 0.25 * max(1, r.get("area") or 0) and (r.get("other") or 0) >= params.present_min_area_px:
            flags |= FLAG_OTHER_LIGHT
        if r.get("area") and (r.get("sat") or 0) > 0.25 * r["area"]:
            flags |= FLAG_SATURATED
        b = r.get("bbox")
        if b and (b[0] <= 4 or b[1] <= 4 or b[0] + b[2] >= width - 4 or b[1] + b[3] >= height - 4):
            flags |= FLAG_EDGE
        r["flags"] = flags
    edge = np.array([bool(r.get("flags", 0) & FLAG_EDGE) for r in rows], dtype=bool)
    # peaks and summaries use frames where the flame is fully in view and not a glow spike
    # (a region cut by the frame edge has an unknown size; at ignition it is the igniter glow)
    steady = visible & ~transient & ~edge
    if not steady.any():
        steady = visible & ~transient

    # ---- events (image-derived, stated as such)
    events: dict = {"firstFlameS": None, "lastFlameS": None, "visibleS": 0.0, "episodes": 0,
                    "peakAreaS": None, "peakAreaPx": None}
    if visible.any():
        idx = np.nonzero(visible)[0]
        events["firstFlameS"] = round(times[idx[0]], 2)
        events["lastFlameS"] = round(times[idx[-1]], 2)
        events["visibleS"] = round(float(visible.sum()) / hz, 2)
        events["episodes"] = int(np.sum(np.diff(np.concatenate([[0], visible.astype(int)])) == 1))
        pool = np.nonzero(steady)[0] if steady.any() else idx
        peak_i = int(max(pool, key=lambda i: area[i] or 0))
        events["peakAreaS"] = round(times[peak_i], 2)
        events["peakAreaPx"] = area[peak_i]
    events["transientFrames"] = int((visible & transient).sum())
    events["edgeFrames"] = int((visible & edge).sum())
    events["litFrames"] = int(sum(1 for r in rows if r.get("lit")))

    # ---- overlay telemetry
    osd_out = None
    if reader is not None and registration is not None:
        fields = {}
        for f in reader.layout.fields:
            cleaned = clean_osd([r["osd"].get(f.key) if r["valid"] else None for r in rows])
            fields[f.key] = cleaned
        clocks = [(r["t"], r["clock"]) for r in rows if r["clock"] is not None]
        offsets = [(c - datetime(1970, 1, 1)).total_seconds() - t for t, c in clocks]
        start = None
        if offsets:
            start_epoch = float(np.median(offsets))
            consistent = sum(1 for o in offsets if abs(o - start_epoch) <= 2.0) / len(offsets)
            start = {"clockAtVideoStart": datetime.utcfromtimestamp(start_epoch).isoformat(timespec="seconds"),
                     "consistency": round(consistent, 3)}
        expected = date.fromisoformat(experiment["date"]) if experiment.get("date") else None
        read_rates = {k: round(sum(v is not None for v, ok in zip(series, valid_mask) if ok) / max(1, valid_mask.sum()), 3)
                      for k, series in fields.items()}
        osd_out = {
            "fields": [{"key": f.key, "label": f.label, "unit": f.unit, "meaning": f.meaning,
                        "displayScale": f.scale} for f in reader.layout.fields],
            "registration": {"score": round(registration.score, 3), "x0": registration.x0,
                             "y0": registration.y0, "scale": registration.scale, "yscale": registration.yscale},
            "readRate": read_rates,
            "dateCheck": date_check([c for _, c in clocks], expected),
            "clock": start,
            "series": fields,
        }

    # ---- deep-embedding similarity (optional GPU pass)
    embedding_out = None
    if embeddings is not None and embedding_times is not None and len(embeddings) > 2:
        embedding_out = embedding_summary(embeddings, embedding_times)

    # ---- keyframes
    keyframes = None
    if keyframe_path is not None and keyframe_source:
        keyframes = write_keyframes(path, keyframe_path, rows, visible, fps)

    # ---- publish at store_hz
    keep = max(1, int(round(hz / profile.store_hz)))
    sel = list(range(0, len(rows), keep))
    def col(key, digits=0, scale=1.0):
        return [_round(rows[i][key] * scale, digits) if rows[i].get(key) is not None else None for i in sel]
    bbox = [rows[i].get("bbox") for i in sel]
    cent = [rows[i].get("centroid") for i in sel]
    series = {
        "t": [round(rows[i]["t"], 2) for i in sel],
        "valid": [1 if rows[i]["valid"] else 0 for i in sel],
        "visible": [1 if visible[i] else 0 for i in sel],
        "areaPx": col("area"),
        "corePx": col("core"),
        "bboxX": [b[0] if b else None for b in bbox],
        "bboxY": [b[1] if b else None for b in bbox],
        "bboxW": [b[2] if b else None for b in bbox],
        "bboxH": [b[3] if b else None for b in bbox],
        "cx": [_round(c[0]) if c else None for c in cent],
        "cy": [_round(c[1]) if c else None for c in cent],
        "brightness": col("sum", 0, 1e-3),
        "peakExcess": col("peak"),
        "saturatedPx": col("sat"),
        "haloPx": col("halo"),
        "otherPx": col("other"),
        "flags": [rows[i].get("flags", 0) for i in sel],
        "ssim": col("ssim", 3),
        "hist": col("hist", 3),
        "iou": col("iou", 3),
        "flowPxS": col("flow", 1),
    }
    if osd_out is not None:
        osd_out["series"] = {k: [v[i] for i in sel] for k, v in osd_out["series"].items()}

    valid_count = int(valid_mask.sum())
    summary = summarize(rows, steady, hz)
    return {
        **base,
        "status": "ok",
        "source": {"fps": round(fps, 5), "frameCount": frames, "durationS": round(frames / fps, 3),
                   "width": width, "height": height},
        "sampling": {"analysisHz": round(hz, 4), "storeHz": round(hz / keep, 4), "stride": stride * keep},
        "coverage": {"analysedFrames": len(rows), "instrumentFrames": valid_count,
                     "instrumentFraction": round(valid_count / max(1, len(rows)), 4),
                     "flameFrames": int(visible.sum())},
        "segmentation": {"photoRoi": {"layout": photo_roi[0], "box": list(photo_roi[1])} if photo_roi else None,
                         "noiseSigma": round(background.noise, 3), "weakThreshold": round(background.t_lo, 2),
                         "strongThreshold": round(background.t_hi, 2), "workScale": params.work_scale,
                         "overlayBox": list(box) if box else None},
        "events": events,
        "summary": summary,
        "series": series,
        "osd": osd_out,
        "embedding": embedding_out,
        "keyframes": keyframes,
        "contours": [polygons[i] for i in sel],
    }


FLAG_LIT = 1  # chamber lights on: flame not measured
FLAG_TRANSIENT = 2  # area spike vs. surrounding +-3 s (igniter flash, scene lighting)
FLAG_OTHER_LIGHT = 4  # sizeable luminous regions outside the primary flame (reflections, debris)
FLAG_SATURATED = 8  # > 25 % of the flame mask clipped at 255: brightness is a lower bound
FLAG_EDGE = 16  # flame region touches the frame edge: it may extend out of view


def transient_frames(area: list[int | None], hz: float, factor: float, min_area: int,
                     min_glow_px: int = 15000) -> np.ndarray:
    """Large, short area spikes: area >= ``min_glow_px`` and > ``factor`` x the median of the
    surrounding +-3 s (self excluded). The size floor keeps the natural flicker of small flames
    from being mistaken for igniter flashes or scene lighting."""
    a = np.array([x or 0 for x in area], dtype=float)
    half = max(1, int(round(3 * hz)))
    out = np.zeros(len(a), dtype=bool)
    for i in range(len(a)):
        if a[i] < max(4 * min_area, min_glow_px):
            continue
        window = np.concatenate([a[max(0, i - half):i], a[i + 1:i + 1 + half]])
        if window.size and a[i] > factor * max(float(np.median(window)), min_area):
            out[i] = True
    return out


def summarize(rows: list[dict], visible: np.ndarray, hz: float) -> dict:
    vis = [r for r, v in zip(rows, visible) if v and r.get("area") is not None]
    if not vis:
        return {"meanAreaPx": None, "maxAreaPx": None, "maxBBoxW": None, "maxBBoxH": None,
                "meanBrightness": None, "saturatedFraction": None, "meanSsim": None, "meanIou": None,
                "meanFlowPxS": None, "dominantFlickerHz": None}
    areas = np.array([r["area"] for r in vis], dtype=float)
    def mean(key):
        values = [r[key] for r in vis if r.get(key) is not None]
        return float(np.mean(values)) if values else None
    sat = sum(r.get("sat") or 0 for r in vis) / max(1.0, float(areas.sum()))
    return {
        "meanAreaPx": _round(float(areas.mean())),
        "maxAreaPx": _round(float(areas.max())),
        "maxBBoxW": max(r["bbox"][2] for r in vis if r.get("bbox")),
        "maxBBoxH": max(r["bbox"][3] for r in vis if r.get("bbox")),
        "meanBrightness": _round((mean("sum") or 0) * 1e-3),
        "saturatedFraction": round(sat, 4),
        "meanSsim": _round(mean("ssim"), 3),
        "meanIou": _round(mean("iou"), 3),
        "meanFlowPxS": _round(mean("flow"), 1),
        "dominantFlickerHz": dominant_frequency([r.get("area") or 0 for r in rows], visible, hz),
    }


def dominant_frequency(area: list[float], visible: np.ndarray, hz: float) -> dict | None:
    """Strongest periodicity of flame area inside the longest visible run (Welch-free periodogram).

    Reported only if the run is >= 20 s and the peak carries >= 15 % of the detrended variance, so a
    noisy spectrum is never presented as an oscillation.
    """
    best = (0, 0)
    i = 0
    while i < len(visible):
        if visible[i]:
            j = i
            while j < len(visible) and visible[j]:
                j += 1
            if j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        else:
            i += 1
    n = best[1] - best[0]
    if n < 20 * hz:
        return None
    x = np.asarray(area[best[0]:best[1]], dtype=float)
    t = np.arange(n)
    x = x - np.polyval(np.polyfit(t, x, 2), t)
    x *= np.hanning(n)
    power = np.abs(np.fft.rfft(x)) ** 2
    freqs = np.fft.rfftfreq(n, 1 / hz)
    # at least 4 cycles inside the window, below 90 % of Nyquist
    band = (freqs >= max(0.2, 4.0 * hz / n)) & (freqs <= hz / 2 * 0.9)
    if not band.any() or power[band].sum() <= 0:
        return None
    banded = np.where(band, power, 0.0)
    k = int(np.argmax(banded))
    share = float(banded[max(0, k - 1):k + 2].sum() / banded.sum())
    if share < 0.15:
        return None
    return {"hz": round(float(freqs[k]), 3), "powerShare": round(share, 3), "windowS": round(n / hz, 1)}


def embedding_summary(embeddings: np.ndarray, times: np.ndarray, grid: int = 64) -> dict:
    """Consecutive cosine similarity, a binned recurrence matrix and novelty-based scene segments."""
    e = embeddings / np.maximum(np.linalg.norm(embeddings, axis=1, keepdims=True), 1e-8)
    consecutive = np.sum(e[1:] * e[:-1], axis=1)
    bins = np.minimum((np.arange(len(e)) * grid) // len(e), grid - 1)
    centroids = np.stack([e[bins == b].mean(axis=0) for b in range(grid) if (bins == b).any()])
    centroids /= np.maximum(np.linalg.norm(centroids, axis=1, keepdims=True), 1e-8)
    rec = centroids @ centroids.T
    novelty = foote_novelty(rec, 4)
    boundaries = peak_pick(novelty, 0.15)
    edges = [0, *boundaries, len(centroids)]
    bin_times = [float(times[bins == b].min()) for b in range(grid) if (bins == b).any()]
    end_time = float(times[-1])
    segments = [{"startS": round(bin_times[a], 1), "endS": round(bin_times[b] if b < len(bin_times) else end_time, 1)}
                for a, b in zip(edges[:-1], edges[1:])]
    lo = float(rec.min())
    return {
        "model": "dinov2_vits14",
        "hz": round(float(len(times) / max(times[-1] - times[0], 1e-6)), 3),
        "t": [round(float(x), 2) for x in times[1:]],
        "cosPrev": [round(float(x), 4) for x in consecutive],
        "recurrence": {"size": len(centroids), "min": round(lo, 4),
                       "binStartS": [round(x, 1) for x in bin_times],
                       "values": [int(round(255 * (v - lo) / max(1e-6, 1 - lo))) for v in rec.ravel()]},
        "novelty": [round(float(x), 4) for x in novelty],
        "segments": segments,
    }


def foote_novelty(matrix: np.ndarray, half: int) -> np.ndarray:
    """Foote (2000) checkerboard-kernel novelty along the diagonal of a self-similarity matrix."""
    n = len(matrix)
    size = 2 * half
    sign = np.ones((size, size))
    sign[:half, half:] = -1
    sign[half:, :half] = -1
    g = np.outer(np.hanning(size + 2)[1:-1], np.hanning(size + 2)[1:-1])
    kernel = sign * g
    padded = np.pad(matrix, half, mode="edge")
    out = np.array([float((padded[i:i + size, i:i + size] * kernel).sum()) for i in range(n)])
    out -= out.min()
    return out / out.max() if out.max() > 0 else out


def peak_pick(signal: np.ndarray, threshold: float, min_gap: int = 4) -> list[int]:
    peaks = []
    for i in range(1, len(signal) - 1):
        if signal[i] >= threshold and signal[i] >= signal[i - 1] and signal[i] > signal[i + 1]:
            if not peaks or i - peaks[-1] >= min_gap:
                peaks.append(i)
            elif signal[i] > signal[peaks[-1]]:
                peaks[-1] = i
    return peaks


def still_photo_roi(cap: cv2.VideoCapture, frames: int, width: int, height: int,
                    layout) -> tuple[str, tuple[int, int, int, int]]:
    """Which playback layout the still-camera recording uses, and where its photo is."""
    greys = []
    for k in range(24):
        frame = _read_at(cap, int(frames * (k + 0.5) / 24))
        if frame is not None:
            greys.append(cv2.cvtColor(cv2.resize(frame, (720, 480)), cv2.COLOR_BGR2GRAY))
    sx, sy = width / 720.0, height / 480.0
    scale = lambda b: (int(b[0] * sx), int(b[1] * sy), int(b[2] * sx), int(b[3] * sy))  # noqa: E731
    if not greys:
        return "fullscreen", scale(layout.fullscreen_photo)
    median = np.median(np.stack(greys), axis=0)
    a, b = layout.histogram_edge_x
    edge = median[int(0.27 * 480):int(0.5 * 480), a:b].mean(axis=0).max()
    if edge >= layout.histogram_edge_min:
        return "metadata", scale(layout.metadata_photo)
    return "fullscreen", scale(layout.fullscreen_photo)


def write_keyframes(path: Path, out: Path, rows: list[dict], visible: np.ndarray, fps: float) -> dict:
    """A 4x3 sprite of evenly spaced frames across the flame-visible span (or the whole video)."""
    indices = [r["i"] for r in rows]
    if visible.any():
        vis = np.nonzero(visible)[0]
        lo, hi = indices[vis[0]], indices[vis[-1]]
    else:
        valid = [r["i"] for r in rows if r["valid"]] or indices
        lo, hi = valid[0], valid[-1]
    targets = [lo + (hi - lo) * k / (KEYFRAME_COUNT - 1) for k in range(KEYFRAME_COUNT)]
    # only instrument-camera frames with the chamber dark (no LOS screens, photo reviews, lit cabin)
    usable = [r["i"] for r in rows if r["valid"] and not r.get("lit")] or indices
    picks = [min(usable, key=lambda i: abs(i - target)) for target in targets]
    cap = cv2.VideoCapture(str(path))
    tw, th = KEYFRAME_TILE
    sheet = np.zeros((th * 3, tw * 4, 3), dtype=np.uint8)
    times = []
    for k, frame_index in enumerate(picks):
        frame = _read_at(cap, frame_index)
        if frame is not None:
            r, c = divmod(k, 4)
            sheet[r * th:(r + 1) * th, c * tw:(c + 1) * tw] = cv2.resize(frame, (tw, th), interpolation=cv2.INTER_AREA)
        times.append(round(frame_index / fps, 2))
    cap.release()
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), sheet, [cv2.IMWRITE_WEBP_QUALITY, 72])
    return {"file": out.name, "tileW": tw, "tileH": th, "cols": 4, "rows": 3, "t": times}
