"""Frame similarity index: "show me the frames most like this one" across the whole dataset.

    python pipeline/vision/frame_index.py --out public/data/psi-25/vision --frames <embed-frames dir> [--hz 1]

For every analysed video, the cached 2 Hz frames (overlay blanked, written by ``analyze.py``) are
thinned to ``--hz`` and kept only while the flame is visible and measured. Each frame is embedded
with DINOv2 ViT-S/14 (self-supervised, Oquab et al. 2024, arXiv:2304.07193), L2-normalised,
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
import pickle
import sys
import time

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from embed import embed_frames, load_model  # noqa: E402

DIMS = 128
THUMB = (96, 64)
SHEET_COLS = SHEET_ROWS = 16


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--frames", type=Path, required=True)
    parser.add_argument("--hz", type=float, default=1.0)
    args = parser.parse_args()

    index = json.loads((args.out / "index.json").read_text(encoding="utf8"))
    seen: set[str] = set()
    videos: list[dict] = []
    rows: list[tuple[int, float]] = []
    jpgs: list[bytes] = []
    for entry in index["videos"]:
        vid = entry["videoId"]
        if entry["status"] != "ok" or vid in seen:
            continue
        seen.add(vid)
        pkl = args.frames / f"{vid}.pkl"
        if not pkl.exists():
            continue
        data = json.loads((args.out / f"{vid}.json").read_text(encoding="utf8"))
        s = data["series"]
        flags = s.get("flags") or [0] * len(s["t"])
        t_arr = np.asarray(s["t"])
        with open(pkl, "rb") as handle:
            frames = pickle.load(handle)
        v_index = len(videos)
        kept = 0
        last = -1e9
        for t, blob in frames:
            if t - last < 1.0 / args.hz - 1e-6:
                continue
            i = int(np.clip(np.searchsorted(t_arr, t), 0, len(t_arr) - 1))
            if not s["visible"][i] or flags[i] & (1 | 2):  # flame visible, measured, not a glow spike
                continue
            rows.append((v_index, round(float(t), 2)))
            jpgs.append(blob)
            last = t
            kept += 1
        if kept:
            videos.append({"videoId": vid, "experimentId": data["experimentId"], "kind": data["kind"], "frames": kept})
        else:
            # keep v_index aligned with videos list
            pass
    print(f"{len(rows)} frames from {len(videos)} videos", flush=True)

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
        "selection": "flame visible, measured (not lit), not a glow transient",
        "thumbs": {"tileW": tw, "tileH": th, "cols": SHEET_COLS, "rows": SHEET_ROWS, "sheets": sheets},
        "videos": videos,
        "rows": rows,
    }
    (args.out / "frame-index.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf8")
    print(json.dumps({k: v for k, v in meta.items() if k not in ("videos", "rows", "thumbs")}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
