"""Flame segmentation and per-frame measurements.

Model (documented, deterministic, no training data required):

* **Background** ``B``: per-pixel 25th percentile of ~120 frames sampled across the video (blurred,
  at half resolution). Static scene light — LEDs, a lit sample, the overlay boxes — ends up in ``B``.
* **Excess brightness** ``E = max_c(F_c - B_c) - median(...)``: how much brighter than the scene each
  pixel is, in 8-bit counts; the per-frame median removes global exposure drift.
* **Hysteresis**: pixels above a weak threshold ``T_lo`` are candidates; a candidate region is a flame
  if it contains a pixel above the strong threshold ``T_hi`` (luminous flame) *or* it is large and
  consistently above the weak threshold (dim blue flame near extinction, which never reaches
  ``T_hi``). Both thresholds scale with the measured sensor noise ``sigma`` (robust MAD).
* **Adaptive core**: the luminous core is ``E > max(T_hi, 0.35 * P99.9(E))`` — relative to the
  brightest structure in the frame, so walls lit by the igniter are not mistaken for the source.
* **Halo rule**: inside a luminous region only weak pixels within ``halo_px`` of the core are kept;
  dropped glow is reported as ``halo_px`` for QA.
* **Primary group**: regions closer than ``merge_px`` are grouped; the group with the most excess
  light is the flame. Other luminous regions (reflections, debris) are reported as ``other_px``.
* **Lit chamber**: if the scene median exceeds ``lit_threshold`` the cabin lights are on and the
  frame is flagged instead of measured.

Everything reported is an image measurement in pixels or 8-bit counts. There is no length scale in
most BASS-II footage (the ReadMe notes the deployed scale "may not be visible"), so nothing here is
converted to millimetres.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from profiles import SegmentationParams


@dataclass
class Background:
    image: np.ndarray  # float32 HxWx3 at work scale
    noise: float  # robust sigma of (frame - background), 8-bit counts
    exclude: np.ndarray  # bool HxW at work scale: overlay band and borders
    t_lo: float
    t_hi: float


@dataclass
class FrameMeasure:
    area_px: int  # full-resolution pixels inside the flame mask
    core_px: int  # ... of which above the strong threshold (luminous core)
    bbox: tuple[int, int, int, int] | None  # x, y, w, h in full-resolution px
    centroid: tuple[float, float] | None  # brightness-weighted, full-resolution px
    sum_excess: float  # integrated excess brightness (8-bit counts x full-res px)
    peak_excess: float
    saturated_px: int  # full-res px at 255 in any channel inside the mask
    polygons: list[np.ndarray]  # each Nx2 int, full-resolution px
    mask: np.ndarray  # bool, work scale
    halo_px: int = 0  # full-res px of connected glow dropped by the halo rule (QA signal)
    other_px: int = 0  # full-res px of luminous regions outside the primary flame group


def prepare(frame_bgr: np.ndarray, params: SegmentationParams) -> np.ndarray:
    small = cv2.resize(frame_bgr, None, fx=params.work_scale, fy=params.work_scale, interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(small.astype(np.float32), (0, 0), params.blur_sigma)


def build_background(samples: list[np.ndarray], exclude: np.ndarray, params: SegmentationParams) -> Background:
    stack = np.stack(samples)  # N x H x W x 3, prepared frames
    image = np.percentile(stack, params.background_percentile, axis=0).astype(np.float32)
    residual = (stack - image[None]).max(axis=3)[:, ~exclude]
    noise = float(1.4826 * np.median(np.abs(residual - np.median(residual))))
    noise = max(noise, 0.5)
    t_lo = max(params.low_floor, params.low_sigma * noise)
    t_hi = max(params.high_floor, params.high_sigma * noise)
    return Background(image=image, noise=noise, exclude=exclude, t_lo=t_lo, t_hi=t_hi)


def excess(prepared: np.ndarray, background: Background) -> np.ndarray:
    e = (prepared - background.image).max(axis=2)
    e -= float(np.median(e[~background.exclude]))
    e[background.exclude] = 0
    return e


def lit_level(prepared: np.ndarray, background: Background) -> float:
    """Median brightness of the scene (8-bit counts, overlay excluded). The chamber is imaged dark;
    a high median means cabin/work lights are on and flame light cannot be separated from scene light."""
    return float(np.median(prepared.max(axis=2)[~background.exclude]))


def segment(prepared: np.ndarray, raw_bgr: np.ndarray, background: Background,
            params: SegmentationParams) -> FrameMeasure:
    e = excess(prepared, background)
    weak = e > background.t_lo
    valid = e[~background.exclude]
    top = float(np.partition(valid, int(0.999 * (valid.size - 1)))[int(0.999 * (valid.size - 1))]) if valid.size else 0.0
    # The luminous core is relative to the brightest structure in the frame: during igniter glow the
    # lit chamber walls exceed the absolute threshold but stay well below the source itself.
    core_threshold = max(background.t_hi, params.core_fraction * top)
    strong = e > core_threshold
    count, labels, stats, _ = cv2.connectedComponentsWithStats(weak.astype(np.uint8), connectivity=8)
    halo_suppressed = 0
    other = 0
    if count > 1:
        areas = stats[:, cv2.CC_STAT_AREA]
        sums = np.bincount(labels.ravel(), weights=e.ravel(), minlength=count)
        has_strong = np.zeros(count, dtype=bool)
        has_strong[np.unique(labels[strong])] = True
        luminous = has_strong & (areas >= params.min_component_px)
        mean = sums / np.maximum(areas, 1)
        dim = ~has_strong & (areas >= params.dim_min_area_px) & (mean >= params.dim_min_mean_factor * background.t_lo)
        luminous[0] = dim[0] = False
        # Halo rule: inside luminous regions keep weak pixels only near the core, so light thrown onto
        # the chamber walls (connected to the flame, but far from it) is not counted as flame.
        core = strong & luminous[labels]
        if core.any():
            near = cv2.distanceTransform((~core).astype(np.uint8), cv2.DIST_L2, 3) <= params.halo_px
        else:
            near = np.zeros_like(core)
        in_luminous = luminous[labels]
        candidate = (in_luminous & near) | dim[labels]
        halo_suppressed = int((in_luminous & ~near).sum())
        # Primary flame = the group of nearby regions (gap < merge_px) carrying the most excess light.
        # Remote bright regions (reflections, debris, the igniter far from the flame) are reported
        # separately as "other luminous" pixels, never silently merged into the flame box.
        mask = candidate
        if candidate.any():
            k = 2 * int(params.merge_px) + 1
            grown = cv2.dilate(candidate.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
            g_count, groups = cv2.connectedComponents(grown, connectivity=8)
            if g_count > 2:
                weight = np.bincount(groups[candidate], weights=e[candidate], minlength=g_count)
                best = int(np.argmax(weight))
                mask = candidate & (groups == best)
                other = int((candidate & ~mask).sum())
    else:
        mask = np.zeros_like(weak)
    inv = 1.0 / params.work_scale
    px_scale = inv * inv
    area_work = int(mask.sum())
    if area_work == 0:
        return FrameMeasure(0, 0, None, None, 0.0, 0.0, 0, [], mask, int(round(halo_suppressed * px_scale)),
                            int(round(other * px_scale)))

    ys, xs = np.nonzero(mask)
    weights = np.clip(e[ys, xs], 0, None)
    wsum = float(weights.sum()) or 1.0
    cx = float((xs * weights).sum() / wsum + 0.5) * inv
    cy = float((ys * weights).sum() / wsum + 0.5) * inv
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    bbox = (int(x0 * inv), int(y0 * inv), int(round((x1 - x0) * inv)), int(round((y1 - y0) * inv)))
    core = int((mask & strong).sum())

    h, w = raw_bgr.shape[:2]
    full_mask = cv2.resize(mask.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST).astype(bool)
    saturated = int((raw_bgr[full_mask] >= 254).any(axis=1).sum())

    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[: params.contour_max_polygons]
    polygons = []
    for contour in contours:
        if cv2.contourArea(contour) < 2 and len(polygons):
            continue
        approx = cv2.approxPolyDP(contour, params.contour_epsilon_px, True).reshape(-1, 2)
        polygons.append(np.round((approx.astype(np.float32) + 0.5) * inv).astype(np.int32))

    return FrameMeasure(
        area_px=int(round(area_work * px_scale)),
        core_px=int(round(core * px_scale)),
        bbox=bbox,
        centroid=(round(cx, 1), round(cy, 1)),
        sum_excess=float(weights.sum() * px_scale),
        peak_excess=float(e[ys, xs].max()),
        saturated_px=saturated,
        polygons=polygons,
        mask=mask,
        halo_px=int(round(halo_suppressed * px_scale)),
        other_px=int(round(other * px_scale)),
    )


def overlay_exclusion(shape: tuple[int, int], osd_box: tuple[int, int, int, int] | None,
                      params: SegmentationParams) -> np.ndarray:
    """Work-scale exclusion mask: the overlay band (full-res box x, y, w, h) plus a 2 px border."""
    h = int(round(shape[0] * params.work_scale))
    w = int(round(shape[1] * params.work_scale))
    exclude = np.zeros((h, w), dtype=bool)
    exclude[:2] = exclude[-2:] = True
    exclude[:, :2] = exclude[:, -2:] = True
    if osd_box is not None:
        x, y, bw, bh = (int(round(v * params.work_scale)) for v in osd_box)
        exclude[max(0, y):y + bh, max(0, x):x + bw] = True
    return exclude
