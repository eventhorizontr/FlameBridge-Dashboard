"""Frame-to-frame similarity metrics.

All metrics compare consecutive *analysed* frames (``1 / sample_hz`` apart) with the overlay band
blanked, so changing telemetry digits never register as scene change.

* ``ssim``  — structural similarity of the grey image (Wang, Bovik, Sheikh & Simoncelli 2004,
  IEEE TIP 13(4):600-612, DOI 10.1109/TIP.2003.819861), Gaussian window sigma = 1.5, in [-1, 1].
* ``hist``  — 1 - Bhattacharyya distance of hue/saturation/value histograms, in [0, 1]: colour
  composition, insensitive to where things are.
* ``iou``   — Jaccard index of the two flame masks, in [0, 1]: does the flame keep its shape and place?
  ``None`` when neither frame has a flame.
* ``flow``  — mean dense optical-flow speed (Farneback 2003) inside the flame region, full-resolution
  px/s: how fast luminous structures move.
* ``emb``   — cosine similarity of self-supervised DINOv2 embeddings (Oquab et al. 2024, TMLR,
  arXiv:2304.07193) computed in ``embed.py``: "contextual" similarity of the whole scene.
"""
from __future__ import annotations

import cv2
import numpy as np

CONTEXT_SIZE = (180, 120)
HIST_BINS = [24, 8, 8]
HIST_RANGES = [0, 180, 0, 256, 0, 256]


def context_image(frame_bgr: np.ndarray, exclude_full: np.ndarray | None) -> tuple[np.ndarray, np.ndarray]:
    """(grey 180x120 float32, HSV histogram) of a frame with the overlay band blanked."""
    frame = frame_bgr
    if exclude_full is not None:
        frame = frame_bgr.copy()
        frame[exclude_full] = 0
    small = cv2.resize(frame, CONTEXT_SIZE, interpolation=cv2.INTER_AREA)
    grey = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1, 2], None, HIST_BINS, HIST_RANGES)
    cv2.normalize(hist, hist, alpha=1.0, norm_type=cv2.NORM_L1)
    return grey, hist


def ssim(a: np.ndarray, b: np.ndarray) -> float:
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    blur = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)  # noqa: E731
    mu_a, mu_b = blur(a), blur(b)
    var_a = blur(a * a) - mu_a * mu_a
    var_b = blur(b * b) - mu_b * mu_b
    cov = blur(a * b) - mu_a * mu_b
    num = (2 * mu_a * mu_b + c1) * (2 * cov + c2)
    den = (mu_a * mu_a + mu_b * mu_b + c1) * (var_a + var_b + c2)
    return float((num / den).mean())


def hist_similarity(h1: np.ndarray, h2: np.ndarray) -> float:
    return float(1.0 - cv2.compareHist(h1, h2, cv2.HISTCMP_BHATTACHARYYA))


def mask_iou(m1: np.ndarray, m2: np.ndarray) -> float | None:
    union = int((m1 | m2).sum())
    if union == 0:
        return None
    return float((m1 & m2).sum() / union)


def flow_speed(g1: np.ndarray, g2: np.ndarray, region: np.ndarray, px_per_context_px: float,
               dt_s: float) -> float | None:
    """Mean optical-flow speed inside ``region`` (bool, context size) in full-res px/s."""
    if not region.any() or dt_s <= 0:
        return None
    flow = cv2.calcOpticalFlowFarneback(g1.astype(np.uint8), g2.astype(np.uint8), None,
                                        0.5, 3, 15, 3, 5, 1.2, 0)
    speed = np.linalg.norm(flow[region], axis=1)
    return float(speed.mean() * px_per_context_px / dt_s)


def context_region(mask_work: np.ndarray) -> np.ndarray:
    """Flame mask resized to the context grid and dilated so motion at the edges counts."""
    region = cv2.resize(mask_work.astype(np.uint8), CONTEXT_SIZE, interpolation=cv2.INTER_NEAREST)
    return cv2.dilate(region, np.ones((5, 5), np.uint8)).astype(bool)
