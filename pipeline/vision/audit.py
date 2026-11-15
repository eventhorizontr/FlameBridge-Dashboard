"""Audit mosaic: one tile per analysed video at its peak and mid-burn, with the stored detection.

    python pipeline/vision/audit.py --data public/data/psi-25 --cache <videos> --out <dir> [--per-sheet 24]

Every analysed video appears once (peak frame | mid-burn frame side by side), so a reviewer can
check the whole dataset in a few sheets. Tiles are labelled with run, kind, area and QA flags.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np

TILE_W, TILE_H = 240, 160


def draw(frame: np.ndarray, d: dict, contours: list | None, i: int) -> np.ndarray:
    s = d["series"]
    w, h = d["source"]["width"], d["source"]["height"]
    if contours and contours[i]:
        for flat in contours[i]:
            pts = np.array(flat, np.float32).reshape(-1, 2) * [w / 1000, h / 1000]
            cv2.polylines(frame, [pts.astype(np.int32)], True, (255, 255, 0), 1, cv2.LINE_AA)
    if s["bboxX"][i] is not None and s["visible"][i]:
        x, y, bw, bh = s["bboxX"][i], s["bboxY"][i], s["bboxW"][i], s["bboxH"][i]
        cv2.rectangle(frame, (x, y), (x + bw, y + bh), (0, 255, 0), 2)
    return cv2.resize(frame, (TILE_W, TILE_H), interpolation=cv2.INTER_AREA)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--per-sheet", type=int, default=24)
    args = parser.parse_args()
    vision = args.data / "vision"
    index = json.loads((vision / "index.json").read_text(encoding="utf8"))
    seen, rows = set(), []
    for v in index["videos"]:
        if v["status"] != "ok" or v["videoId"] in seen:
            continue
        seen.add(v["videoId"])
        rows.append(v)
    rows.sort(key=lambda v: v["experimentId"])
    args.out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for v in rows:
        d = json.loads((vision / f"{v['videoId']}.json").read_text(encoding="utf8"))
        cpath = vision / f"{v['videoId']}.contours.json"
        contours = json.loads(cpath.read_text(encoding="utf8"))["polygons"] if cpath.exists() else None
        s = d["series"]
        vis = [k for k, x in enumerate(s["visible"]) if x]
        cap = cv2.VideoCapture(str(args.cache / f"{v['videoId']}.mp4"))
        fps = d["source"]["fps"]
        pair = []
        if vis:
            peak = max(vis, key=lambda k: (s["areaPx"][k] or 0) if not ((s.get("flags") or [0])[k] & 2) else -1)
            mid = vis[len(vis) // 2]
            picks = [peak, mid]
        else:
            picks = [len(s["t"]) // 3, 2 * len(s["t"]) // 3]
        for k in picks:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(s["t"][k] * fps)))
            ok, frame = cap.read()
            frame = frame if ok else np.zeros((d["source"]["height"], d["source"]["width"], 3), np.uint8)
            pair.append(draw(frame, d, contours, k))
        cap.release()
        tile = np.hstack(pair)
        flags = (s.get("flags") or [0])[picks[0]]
        label = f"{d['experimentId'].split(':')[1]} {d['kind'][:5]} vis {d['events']['visibleS']:.0f}s peak {d['events']['peakAreaPx']} f{flags}"
        tile = cv2.copyMakeBorder(tile, 16, 2, 2, 2, cv2.BORDER_CONSTANT, value=(30, 30, 30))
        cv2.putText(tile, label, (4, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 255), 1, cv2.LINE_AA)
        tiles.append(tile)
    cols = 3
    for sheet, start in enumerate(range(0, len(tiles), args.per_sheet)):
        chunk = tiles[start:start + args.per_sheet]
        while len(chunk) % cols:
            chunk.append(np.zeros_like(tiles[0]))
        grid = np.vstack([np.hstack(chunk[r:r + cols]) for r in range(0, len(chunk), cols)])
        cv2.imwrite(str(args.out / f"audit-{sheet + 1:02d}.jpg"), grid, [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(f"{len(tiles)} videos -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
