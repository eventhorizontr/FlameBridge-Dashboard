"""Train the overlay glyph classifier from labels that come for free.

No manual labelling. Two independent label sources:

1. **Dates.** The overlay prints "MM/DD/YY" on every frame and the test matrix gives every test's
   true date (the ReadMe documents the overlay clock as one day ahead), so every date digit cell is
   labelled exactly; "/" and ":" sit at fixed columns; "-" and "." are labelled by their
   unambiguous ink shape.
2. **Clock continuity.** A stage-1 model trained on (1) reads clocks; the overlay clock advances
   with video time, so confidently read clocks pin a per-video offset and every *other* sampled
   frame's HH:MM:SS digits get an exact label that does not depend on how that cell was classified.
   This supplies the digits that dates rarely contain (3, 5, 9 ...).

A stage-2 CNN is trained on both and exported to ONNX (run with OpenCV DNN, so the analysis
pipeline does not need PyTorch). Validation holds out 20 % of videos entirely; the report keeps
held-out accuracy per class.

Usage (needs torch):  python pipeline/vision/train_osd.py --data public/data/psi-25 --cache <dir>
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta
import json
from pathlib import Path
import random
import sys

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from osd import CELL_H, CELL_W, MARGIN, OsdReader  # noqa: E402
from profiles import ASSETS, PSI25  # noqa: E402

CLASSES = "0123456789-./:"
PAD = 2  # extra pixels harvested around each cell for shift augmentation
TIME_COLS = (9, 10, 12, 13, 15, 16)  # HH MM SS digit columns of the clock row
INPUT_H, INPUT_W = CELL_H + 2 * MARGIN, CELL_W + 2 * MARGIN


def harvest(data_dir: Path, cache: Path, frames_per_video: int, seed: int = 0):
    """Labelled cells (date digits, fixed literals, '-'/'.') + unlabelled clock-time records."""
    reader = OsdReader(PSI25.osd)
    dataset = json.loads((data_dir / "experiments.json").read_text(encoding="utf8"))
    X, y, groups = [], [], []
    times: list[tuple[str, float, np.ndarray]] = []
    rng = random.Random(seed)
    for experiment in dataset["experiments"]:
        if not experiment.get("date"):
            continue
        shown = date.fromisoformat(experiment["date"]) + timedelta(days=PSI25.osd.displayed_date_offset_days)
        date_text = shown.strftime("%m/%d/%y")
        for video in experiment.get("videos") or []:
            path = cache / f"{video['id']}.mp4"
            if not path.exists():
                continue
            cap = cv2.VideoCapture(str(path))
            n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
            if n <= 0 or fps <= 0:
                continue
            registration = None
            for k in range(frames_per_video):
                frame_index = int(n * (k + rng.random()) / frames_per_video)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
                ok, frame = cap.read()
                if not ok:
                    continue
                grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if registration is None:
                    score, x0, y0, scale = reader.register(grey)
                    if score < PSI25.osd.min_register_score:
                        continue
                    registration = (x0, y0, scale)
                x0, y0, scale = registration
                if reader.check_at(grey, x0, y0, scale) < PSI25.osd.min_register_score:
                    continue
                row_cells = reader.cells(grey, x0, y0, 2, range(0, 17), scale, pad=PAD)
                by_col = dict(row_cells)
                if all(c in by_col for c in TIME_COLS):
                    times.append((video["id"], frame_index / fps, np.stack([by_col[c] for c in TIME_COLS])))
                for col, cell in row_cells:
                    label = date_text[col] if col < 8 else (":" if col in (11, 14) else None)
                    if label is not None:
                        X.append(cell); y.append(CLASSES.index(label)); groups.append(video["id"])
                for col, cell in reader.cells(grey, x0, y0, 1, range(0, 20), scale, pad=PAD):
                    label = shape_label(cell)
                    if label is not None:
                        X.append(cell); y.append(CLASSES.index(label)); groups.append(video["id"])
            cap.release()
    return np.array(X, dtype=np.uint8), np.array(y, dtype=np.int64), np.array(groups), times


def shape_label(cell: np.ndarray) -> str | None:
    """'-' and '.' are the only glyphs whose ink is confined to a thin band; label them by shape."""
    m = MARGIN + PAD
    core = cell[m:m + CELL_H, m:m + CELL_W]
    ink = core > 140
    if ink.sum() < 4:
        return None
    rows = np.nonzero(ink.any(axis=1))[0]
    cols = np.nonzero(ink.any(axis=0))[0]
    height, width = rows.max() - rows.min() + 1, cols.max() - cols.min() + 1
    if height <= 6 and width >= 14 and rows.min() >= CELL_H * 0.35 and rows.max() <= CELL_H * 0.85:
        return "-"
    if height <= 7 and width <= 9 and rows.min() >= CELL_H * 0.6:
        return "."
    return None


def label_clock_cells(predict, times):
    """Exact HH:MM:SS labels from clock continuity.

    Displayed seconds S(t) = floor(t + a) for an unknown per-video constant ``a``. A confidently
    read clock gives c = S - t with c <= a < c + 1; reads more than 1.5 s from the video's median are
    discarded as misreads. ``a`` is estimated from robust quantiles and a frame is labelled only if
    it is >= 0.3 s from a second boundary, so the label never depends on how that frame's own cells
    were classified.
    """
    by_video: dict[str, list[tuple[float, np.ndarray]]] = {}
    for vid, t, cells in times:
        by_video.setdefault(vid, []).append((t, cells))
    X, y, groups = [], [], []
    for vid, records in by_video.items():
        probs = predict(np.concatenate([cells for _, cells in records]))
        digit = probs[:, :10] / np.maximum(probs[:, :10].sum(axis=1, keepdims=True), 1e-9)
        reads = []
        for i, (t, _) in enumerate(records):
            p = digit[i * 6:(i + 1) * 6]
            if (p.max(axis=1) < 0.97).any():
                continue
            d = p.argmax(axis=1)
            hh, mm, ss = d[0] * 10 + d[1], d[2] * 10 + d[3], d[4] * 10 + d[5]
            if hh <= 23 and mm <= 59 and ss <= 59:
                reads.append(hh * 3600 + mm * 60 + ss - t)
        if len(reads) < 5:
            continue
        med = float(np.median(reads))
        c = np.array([r for r in reads if abs(r - med) <= 1.5])
        # a lies in [max c, min c + 1); the overlay refreshes at 5 Hz, so use robust quantiles and
        # keep a 0.3 s safety margin from every second boundary.
        a_hat = (float(np.quantile(c, 0.9)) + float(np.quantile(c, 0.1)) + 1.0) / 2.0
        for t, cells in records:
            a, b = int(np.floor(t + a_hat - 0.3)), int(np.floor(t + a_hat + 0.3))
            if a != b:
                continue
            seconds = a % 86400
            text = f"{seconds // 3600:02d}{seconds % 3600 // 60:02d}{seconds % 60:02d}"
            for cell, ch in zip(cells, text):
                X.append(cell); y.append(CLASSES.index(ch)); groups.append(vid)
    return X, y, groups


def normalise(t):
    return (t - 128.0) / 64.0


def train(X: np.ndarray, y: np.ndarray, groups: np.ndarray, epochs: int, seed: int):
    import torch
    from torch import nn

    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    videos = np.unique(groups)
    rng.shuffle(videos)
    held = set(videos[: max(1, len(videos) // 5)])
    val = np.array([g in held for g in groups])
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = nn.Sequential(
        nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
        nn.Conv2d(32, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
        nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
        nn.Flatten(), nn.Linear(64 * (INPUT_H // 4) * (INPUT_W // 4), 128), nn.ReLU(),
        nn.Dropout(0.3), nn.Linear(128, len(CLASSES)),
    ).to(device)

    def crops(batch: np.ndarray, augment: bool):
        out = np.empty((len(batch), 1, INPUT_H, INPUT_W), dtype=np.float32)
        for i, cell in enumerate(batch):
            oy = (cell.shape[0] - INPUT_H) // 2
            ox = (cell.shape[1] - INPUT_W) // 2
            if augment:
                oy += int(rng.integers(-PAD, PAD + 1))
                ox += int(rng.integers(-PAD, PAD + 1))
            c = cell[oy:oy + INPUT_H, ox:ox + INPUT_W].astype(np.float32)
            if augment:
                c = c * rng.uniform(0.7, 1.3) + rng.uniform(-30, 30)
                if rng.random() < 0.3:
                    c = cv2.GaussianBlur(c, (3, 3), rng.uniform(0.3, 1.0))
                c += rng.normal(0, rng.uniform(0, 8), c.shape)
                if rng.random() < 0.2:  # the last overlay column is clipped by the frame edge
                    c[:, INPUT_W - int(rng.integers(3, 13)):] = 0
            out[i, 0] = c
        return normalise(torch.from_numpy(out))

    train_idx = np.nonzero(~val)[0]
    val_idx = np.nonzero(val)[0]
    counts = np.bincount(y[train_idx], minlength=len(CLASSES)).astype(np.float32)
    weights = torch.tensor((counts.sum() / np.maximum(counts, 1)) ** 0.5, dtype=torch.float32, device=device)
    optimiser = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(optimiser, max_lr=3e-3,
                                                    total_steps=epochs * (len(train_idx) // 256 + 1))
    loss_fn = nn.CrossEntropyLoss(weight=weights)

    def predict(cells: np.ndarray) -> np.ndarray:
        model.eval()
        with torch.no_grad():
            parts = [torch.softmax(model(crops(cells[i:i + 2048], False).to(device)), 1).cpu().numpy()
                     for i in range(0, len(cells), 2048)]
        return np.concatenate(parts) if parts else np.zeros((0, len(CLASSES)))

    for epoch in range(epochs):
        model.train()
        rng.shuffle(train_idx)
        for start in range(0, len(train_idx), 256):
            batch = train_idx[start:start + 256]
            optimiser.zero_grad()
            loss = loss_fn(model(crops(X[batch], True).to(device)), torch.from_numpy(y[batch]).to(device))
            loss.backward()
            optimiser.step()
            scheduler.step()
        acc = float((predict(X[val_idx]).argmax(1) == y[val_idx]).mean()) if len(val_idx) else 0.0
        print(f"  epoch {epoch + 1}/{epochs} loss {loss.item():.4f} held-out acc {acc:.5f}", flush=True)

    pred = predict(X[val_idx]).argmax(1)
    truth = y[val_idx]
    report = {
        "accuracy": float((pred == truth).mean()) if len(truth) else None,
        "perClass": {CLASSES[c]: {"n": int((truth == c).sum()),
                                  "accuracy": float((pred[truth == c] == c).mean()) if (truth == c).any() else None}
                     for c in range(len(CLASSES))},
        "trainCells": int(len(train_idx)), "heldOutCells": int(len(val_idx)),
        "heldOutVideos": len(held), "videos": int(len(videos)), "epochs": epochs, "classes": CLASSES,
    }
    return model, predict, report


def export(model, out: Path) -> None:
    import torch
    model = model.eval().cpu()
    dummy = normalise(torch.zeros(1, 1, INPUT_H, INPUT_W))
    torch.onnx.export(model, dummy, str(out), input_names=["cell"], output_names=["logits"],
                      dynamic_axes={"cell": {0: "n"}, "logits": {0: "n"}}, opset_version=13, dynamo=False)


def describe(name: str, y: np.ndarray, groups: np.ndarray) -> None:
    counts = np.bincount(y, minlength=len(CLASSES)) if len(y) else np.zeros(len(CLASSES), int)
    print(f"{name}: {len(y)} cells from {len(np.unique(groups))} videos; "
          + ", ".join(f"{CLASSES[c]}:{n}" for c, n in enumerate(counts)), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=40)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--rounds", type=int, default=3)
    args = parser.parse_args()

    X0, y0, g0, times = harvest(args.data, args.cache, args.frames, args.seed)
    describe("stage 1 (date-labelled)", y0, g0)
    model, predict, stage1 = train(X0, y0, g0, args.epochs, args.seed)
    report = stage1
    ty: list[int] = []
    for round_ in range(args.rounds):
        # re-derive clock labels with the latest model: each round can pin more videos
        tx, ty, tg = label_clock_cells(predict, times)
        describe(f"round {round_ + 1}: clock-continuity labels", np.array(ty, dtype=np.int64), np.array(tg))
        if not tx:
            break
        X = np.concatenate([X0, np.array(tx, dtype=np.uint8)])
        y = np.concatenate([y0, np.array(ty, dtype=np.int64)])
        groups = np.concatenate([g0, np.array(tg)])
        model, predict, report = train(X, y, groups, args.epochs, args.seed)
    report["stage1HeldOutAccuracy"] = stage1["accuracy"]
    report["clockLabelledCells"] = len(ty)
    export(model, ASSETS / "osd-glyph-cnn.onnx")
    (ASSETS / "osd-glyph-cnn.report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    print(json.dumps({k: v for k, v in report.items() if k != "perClass"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
