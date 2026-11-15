"""Visual QA: draw the stored detections back onto the source video.

    python pipeline/vision/qa.py <analysis.json> <video.mp4> <out.png> [--frames 12] [--around peak|span]

Each tile shows the source frame with the flame polygons (cyan), the bounding box (green), the
brightness-weighted centroid (magenta) and the stored numbers, so a reviewer can check what the
published series actually measured.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def render(analysis: dict, video: Path, out: Path, frames: int = 12, tile_w: int = 360) -> None:
    series = analysis["series"]
    t = series["t"]
    vis = [i for i, v in enumerate(series["visible"]) if v]
    if vis:
        lo, hi = vis[0], vis[-1]
        span = max(1, hi - lo)
        picks = [lo + round(span * k / (frames - 1)) for k in range(frames)]
        lo_pad = max(0, lo - int(3 * analysis["sampling"]["storeHz"]))
        picks[0] = lo_pad
    else:
        picks = [round((len(t) - 1) * k / (frames - 1)) for k in range(frames)]
    cap = cv2.VideoCapture(str(video))
    fps = analysis["source"]["fps"]
    w, h = analysis["source"]["width"], analysis["source"]["height"]
    tiles = []
    for i in picks:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t[i] * fps)))
        ok, frame = cap.read()
        if not ok:
            frame = np.zeros((h, w, 3), np.uint8)
        polys = (analysis.get("contours") or [None] * len(t))[i] or []
        for flat in polys:
            pts = np.array(flat, dtype=np.float32).reshape(-1, 2)
            pts[:, 0] *= w / 1000.0
            pts[:, 1] *= h / 1000.0
            cv2.polylines(frame, [pts.astype(np.int32)], True, (255, 255, 0), 1, cv2.LINE_AA)
        if series["bboxX"][i] is not None:
            x, y, bw, bh = series["bboxX"][i], series["bboxY"][i], series["bboxW"][i], series["bboxH"][i]
            cv2.rectangle(frame, (x, y), (x + bw, y + bh), (0, 255, 0), 1)
        if series["cx"][i] is not None:
            cv2.circle(frame, (series["cx"][i], series["cy"][i]), 4, (255, 0, 255), -1)
        label = f"t={t[i]:.1f}s area={series['areaPx'][i]} vis={series['visible'][i]}"
        tile = cv2.resize(frame, (tile_w, int(tile_w * h / w)))
        cv2.rectangle(tile, (0, tile.shape[0] - 18), (tile_w, tile.shape[0]), (0, 0, 0), -1)
        cv2.putText(tile, label, (4, tile.shape[0] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)
        tiles.append(tile)
    cap.release()
    while len(tiles) % 4:
        tiles.append(np.zeros_like(tiles[0]))
    sheet = np.vstack([np.hstack(tiles[k:k + 4]) for k in range(0, len(tiles), 4)])
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), sheet)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("analysis", type=Path)
    parser.add_argument("video", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--frames", type=int, default=12)
    args = parser.parse_args()
    render(json.loads(args.analysis.read_text(encoding="utf8")), args.video, args.out, args.frames)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
