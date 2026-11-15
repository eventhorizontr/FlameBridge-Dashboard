"""Frame similarity index: "show me the frames most like this one" across the whole dataset.

    python pipeline/vision/frame_index.py --out public/data/psi-25/vision --cache <video cache> [--hz 1]

For every analysed video, frames at ``--hz`` are kept only while the flame is visible, measured and
inside the view. Each one is cropped around the measured flame bounding box (padded 1.6x, 3:2,
full source resolution) so that the comparison is about the flame, not the dark chamber around it,
and embedded with DINOv2 ViT-S/14 (self-supervised, Oquab et al. 2024, arXiv:2304.07193), L2-normalised,
projected onto the top 128 principal components of the whole set (variance kept is recorded) and
re-normalised, then stored as int8. Cosine similarity of these vectors is the "contextual"
similarity used by the search API, the assistant and the UI.

Outputs (in ``--out``):
  frame-index.bin    int8, N x D row-major
  frame-index.json   videos, (video, t) per row, D, scale, PCA variance kept, thumbnail sheets
  frames/sim-XX.webp thumbnail sheets (16 x 16 tiles of 96 x 64)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import sys
import time

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from embed import embed_frames, load_model  # noqa: E402

DIMS = 128
THUMB = (96, 64)
SHEET_COLS = SHEET_ROWS = 16


def crop_video(job: tuple[str, str, float]) -> tuple[dict, list[tuple[float, bytes]]]:
    """Flame crops at ``hz`` from one video (visible, measured, not glow, not cut by the edge)."""
    json_path, video_path, hz = job
    data = json.loads(Path(json_path).read_text(encoding="utf8"))
    meta = {"videoId": data["videoId"], "experimentId": data["experimentId"], "kind": data["kind"]}
    if not Path(video_path).exists():
        return meta, []
    s = data["series"]
    flags = s.get("flags") or [0] * len(s["t"])
    W, H = data["source"]["width"], data["source"]["height"]
    fps = data["source"]["fps"]
    box = (data.get("segmentation") or {}).get("overlayBox")
    cap = cv2.VideoCapture(video_path)
    out: list[tuple[float, bytes]] = []
    last = -1e9
    for i, t in enumerate(s["t"]):
        if t - last < 1.0 / hz - 1e-6:
            continue
        if not s["visible"][i] or flags[i] & (1 | 2 | 16) or s["bboxX"][i] is None:
            continue
        x, y, w, h = s["bboxX"][i], s["bboxY"][i], s["bboxW"][i], s["bboxH"][i]
        cw = max(w * 1.6, h * 1.6 * 1.5, 48.0)
        ch = cw / 1.5
        cw, ch = min(cw, W), min(ch, H)
        x0 = int(min(max(x + w / 2 - cw / 2, 0), W - cw))
        y0 = int(min(max(y + h / 2 - ch / 2, 0), H - ch))
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * fps)))
        ok, frame = cap.read()
        if not ok:
            continue
        if box:  # blank the telemetry overlay so changing digits never count as similarity
            bx, by, bw, bh = box
            frame[by:by + bh, bx:bx + bw] = 0
        crop = cv2.resize(frame[y0:y0 + int(ch), x0:x0 + int(cw)], (336, 224), interpolation=cv2.INTER_AREA)
        ok, jpg = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if ok:
            out.append((round(float(t), 2), jpg.tobytes()))
            last = t
    cap.release()
    return meta, out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True, help="video cache")
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--hz", type=float, default=1.0)
    args = parser.parse_args()

    index = json.loads((args.out / "index.json").read_text(encoding="utf8"))
    seen: set[str] = set()
    jobs = []
    for entry in index["videos"]:
        vid = entry["videoId"]
        if entry["status"] != "ok" or vid in seen:
            continue
        seen.add(vid)
        jobs.append((str(args.out / f"{vid}.json"), str(args.cache / f"{vid}.mp4"), args.hz))
    videos: list[dict] = []
    rows: list[tuple[int, float]] = []
    jpgs: list[bytes] = []
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for meta, crops in pool.map(crop_video, jobs):
            if not crops:
                continue
            v_index = len(videos)
            videos.append({**meta, "frames": len(crops)})
            for t, blob in crops:
                rows.append((v_index, t))
                jpgs.append(blob)
    print(f"{len(rows)} flame crops from {len(videos)} videos", flush=True)

    model, device = load_model()
    started = time.time()
    vectors = embed_frames(model, device, jpgs, batch=128)
    print(f"embedded on {device} in {time.time() - started:.0f}s", flush=True)
    vectors /= np.maximum(np.linalg.norm(vectors, axis=1, keepdims=True), 1e-8)

    mean = vectors.mean(axis=0)
    centred = vectors - mean
    _, singular, vt = np.linalg.svd(centred, full_matrices=False)
    components = vt[:DIMS]
    kept_variance = float((singular[:DIMS] ** 2).sum() / (singular ** 2).sum())
    reduced = centred @ components.T
    reduced /= np.maximum(np.linalg.norm(reduced, axis=1, keepdims=True), 1e-8)
    scale = 127.0
    quantised = np.clip(np.round(reduced * scale), -127, 127).astype(np.int8)
    (args.out / "frame-index.bin").write_bytes(quantised.tobytes())

    # sanity: how well does int8+PCA preserve the full cosine ranking? (recall@10 on 200 probes)
    rng = np.random.default_rng(0)
    probes = rng.choice(len(vectors), size=min(200, len(vectors)), replace=False)
    approx = quantised.astype(np.float32) / scale
    recall = []
    for p in probes:
        full = vectors @ vectors[p]
        appr = approx @ approx[p]
        full[p] = appr[p] = -9
        top_full = set(np.argsort(-full)[:10])
        top_appr = set(np.argsort(-appr)[:10])
        recall.append(len(top_full & top_appr) / 10)

    per_sheet = SHEET_COLS * SHEET_ROWS
    sheets = []
    tw, th = THUMB
    for start in range(0, len(jpgs), per_sheet):
        sheet = np.zeros((th * SHEET_ROWS, tw * SHEET_COLS, 3), np.uint8)
        for k, blob in enumerate(jpgs[start:start + per_sheet]):
            img = cv2.imdecode(np.frombuffer(blob, np.uint8), cv2.IMREAD_COLOR)
            r, c = divmod(k, SHEET_COLS)
            sheet[r * th:(r + 1) * th, c * tw:(c + 1) * tw] = cv2.resize(img, THUMB, interpolation=cv2.INTER_AREA)
        name = f"sim-{len(sheets):03d}.webp"
        cv2.imwrite(str(args.out / "frames" / name), sheet, [cv2.IMWRITE_WEBP_QUALITY, 70])
        sheets.append(name)

    meta = {
        "schemaVersion": 1,
        "model": "dinov2_vits14 (timm vit_small_patch14_dinov2.lvd142m)",
        "dims": DIMS,
        "count": len(rows),
        "scale": scale,
        "hz": args.hz,
        "pcaVarianceKept": round(kept_variance, 4),
        "recallAt10VsFull": round(float(np.mean(recall)), 4),
        "selection": "flame visible, measured, not a glow transient, not cut by the frame edge; crop = flame bbox padded 1.6x (3:2)",
        "thumbs": {"tileW": tw, "tileH": th, "cols": SHEET_COLS, "rows": SHEET_ROWS, "sheets": sheets},
        "videos": videos,
        "rows": rows,
    }
    (args.out / "frame-index.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf8")
    print(json.dumps({k: v for k, v in meta.items() if k not in ("videos", "rows", "thumbs")}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
