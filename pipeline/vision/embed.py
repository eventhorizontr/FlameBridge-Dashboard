"""GPU pass: DINOv2 embeddings -> contextual frame similarity, recurrence matrix, scene segments.

DINOv2 (Oquab et al., "DINOv2: Learning Robust Visual Features without Supervision", TMLR 2024,
arXiv:2304.07193) is a self-supervised ViT; its CLS embedding captures what a frame *looks like as a
whole* (flame shape, brightness distribution, scene state) rather than raw pixels, so cosine
similarity between embeddings is a "contextual" similarity. ViT-S/14 is used (384-d).

Reads the 2 Hz frames that ``analyze.py`` cached (overlay blanked) and patches the ``embedding``
section of each ``<videoId>.json``. Needs torch (+ CUDA for speed).
"""
from __future__ import annotations

import json
from pathlib import Path
import pickle
import sys
import time

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze import embedding_summary  # noqa: E402

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


TIMM_MODEL = "vit_small_patch14_dinov2.lvd142m"  # DINOv2 ViT-S/14 weights published via timm


def load_model():
    """DINOv2 ViT-S/14 through the ``timm`` package: code comes from the installed package, only
    the safetensors weights are downloaded (Hugging Face hub)."""
    import timm
    import torch
    model = timm.create_model(TIMM_MODEL, pretrained=True, num_classes=0, dynamic_img_size=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return model.eval().to(device), device


def embed_frames(model, device, jpgs: list[bytes], batch: int = 96) -> np.ndarray:
    import torch
    out = []
    for start in range(0, len(jpgs), batch):
        images = []
        for blob in jpgs[start:start + batch]:
            bgr = cv2.imdecode(np.frombuffer(blob, np.uint8), cv2.IMREAD_COLOR)
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
            images.append((rgb - MEAN) / STD)
        x = torch.from_numpy(np.stack(images)).permute(0, 3, 1, 2).to(device)
        with torch.no_grad(), torch.autocast(device_type="cuda", enabled=device == "cuda"):
            features = model(x)
        out.append(features.float().cpu().numpy())
    return np.concatenate(out) if out else np.zeros((0, 384), np.float32)


def embed_all(out_dir: Path, frames_dir: Path, force: bool = False) -> None:
    model, device = load_model()
    files = sorted(Path(frames_dir).glob("*.pkl"))
    print(f"embedding {len(files)} videos on {device}", flush=True)
    started = time.time()
    for n, path in enumerate(files, 1):
        video_id = path.stem
        target = Path(out_dir) / f"{video_id}.json"
        if not target.exists():
            continue
        data = json.loads(target.read_text(encoding="utf8"))
        if data.get("embedding") and not force:
            continue
        with open(path, "rb") as handle:
            frames = pickle.load(handle)
        if len(frames) < 3:
            continue
        times = np.array([t for t, _ in frames], dtype=np.float64)
        vectors = embed_frames(model, device, [b for _, b in frames])
        data["embedding"] = embedding_summary(vectors, times)
        tmp = target.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
        tmp.replace(target)
        print(f"[{n}/{len(files)}] {video_id} {len(frames)} frames ({(time.time() - started) / 60:.1f} min)", flush=True)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--frames", type=Path, required=True)
    parser.add_argument("--force", action="store_true")
    a = parser.parse_args()
    embed_all(a.out, a.frames, a.force)
