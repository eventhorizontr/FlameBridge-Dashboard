"""Read the telemetry overlay (OSD) that BASS-II burned into every video frame.

1. **Register** the static label row ("FUEL AIR FAN RAD") by normalised cross-correlation over a
   small range of horizontal scales (analogue capture chains stretch the overlay by up to ~1.5 %).
   The peak score doubles as an "is this instrument-camera footage?" test: loss-of-signal screens
   and crew cameras score < 0.35, overlay frames > 0.9.
2. **Classify** each character cell with a small CNN (``train_osd.py``) trained on cells labelled
   from the test-matrix dates — no hand labels. Inference uses OpenCV DNN (ONNX), no PyTorch.
3. **Parse** the right-aligned numeric fields and the "MM/DD/YY HH:MM:SS" row. A cell whose class
   probability is below ``MIN_PROB`` makes the whole field ``None``: unreadable, never guessed.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import re

import cv2
import numpy as np

from profiles import ASSETS, OsdLayout

CELL_W, CELL_H = 22, 13
MARGIN = 3  # model input = cell + 3 px on every side
INK_THRESHOLD = 140
MIN_INK = 2
MIN_PROB = 0.85
REGISTER_SCALES = tuple(round(0.97 + 0.0025 * i, 4) for i in range(25))
NUMBER = re.compile(r"^-?\d+(\.\d+)?$")
CLOCK = re.compile(r"^(\d\d)/(\d\d)/(\d\d) (\d\d):(\d\d):(\d\d)$")
CLOCK_PATTERN = "DD/DD/DD DD:DD:DD"


@dataclass
class OsdReading:
    score: float
    values: dict[str, float | None]
    raw: dict[str, str]
    clock: datetime | None


class OsdReader:
    def __init__(self, layout: OsdLayout, model: str = "osd-glyph-cnn.onnx"):
        self.layout = layout
        self.label = cv2.imread(str(ASSETS / layout.label_template), cv2.IMREAD_GRAYSCALE)
        if self.label is None:
            raise FileNotFoundError("OSD label template missing from pipeline/vision/assets")
        self.search_h = self.label.shape[0] + 160
        self._templates = {1.0: self.label}
        model_path = ASSETS / model
        self.net = cv2.dnn.readNetFromONNX(str(model_path)) if model_path.exists() else None
        self.digits = [i for i, ch in enumerate(layout.glyph_chars) if ch.isdigit()]

    # ---------------------------------------------------------------- registration
    def _template(self, scale: float) -> np.ndarray:
        if scale not in self._templates:
            self._templates[scale] = cv2.resize(self.label, None, fx=scale, fy=1.0, interpolation=cv2.INTER_LINEAR)
        return self._templates[scale]

    def register(self, gray: np.ndarray, scales: tuple[float, ...] | None = None) -> tuple[float, int, int, float]:
        """Return (score, x0, y0, scale) of the first glyph cell of the label row."""
        region = gray[: min(gray.shape[0], self.search_h)]
        best = (-1.0, 0, 0, 1.0)
        dx, dy = self.layout.template_offset
        for scale in scales or REGISTER_SCALES:
            template = self._template(scale)
            if region.shape[0] < template.shape[0] or region.shape[1] < template.shape[1]:
                continue
            _, score, _, loc = cv2.minMaxLoc(cv2.matchTemplate(region, template, cv2.TM_CCOEFF_NORMED))
            if score > best[0]:
                best = (float(score), int(round(loc[0] + dx * scale)), loc[1] + dy, float(scale))
        return best

    def check_at(self, gray: np.ndarray, x0: int, y0: int, scale: float = 1.0) -> float:
        """Presence score at a known registration (searches +-4 px; same scale as ``register``)."""
        template = self._template(scale)
        dx, dy = self.layout.template_offset
        x, y = int(round(x0 - dx * scale)), y0 - dy
        pad = 4
        region = gray[max(0, y - pad):y + template.shape[0] + pad, max(0, x - pad):x + template.shape[1] + pad]
        if region.shape[0] < template.shape[0] or region.shape[1] < template.shape[1]:
            return 0.0
        return float(cv2.matchTemplate(region, template, cv2.TM_CCOEFF_NORMED).max())

    # ---------------------------------------------------------------- cells
    def cells(self, gray: np.ndarray, x0: int, y0: int, row: int, cols: range, scale: float = 1.0,
              pad: int = 0) -> list[tuple[int, np.ndarray]]:
        """Cell crops (cell + MARGIN + pad on each side); the frame is zero-padded at the edges."""
        m = MARGIN + pad
        padded = cv2.copyMakeBorder(gray, m, m, m, CELL_W + m, cv2.BORDER_CONSTANT, value=0)
        y = y0 + row * self.layout.row_px
        out = []
        for col in cols:
            x = int(round(x0 + col * self.layout.pitch_px * scale))
            crop = padded[y:y + CELL_H + 2 * m, x:x + CELL_W + 2 * m]
            if crop.shape == (CELL_H + 2 * m, CELL_W + 2 * m) and x - m < gray.shape[1]:
                out.append((col, crop))
        return out

    def classify(self, crops: list[np.ndarray]) -> np.ndarray:
        """Softmax probabilities, one row per crop (crops are cell + MARGIN)."""
        if self.net is None:
            raise RuntimeError("osd-glyph-cnn.onnx missing: run pipeline/vision/train_osd.py first")
        batch = np.stack(crops).astype(np.float32)[:, None]
        self.net.setInput((batch - 128.0) / 64.0)
        logits = self.net.forward()
        logits = logits - logits.max(axis=1, keepdims=True)
        p = np.exp(logits)
        return p / p.sum(axis=1, keepdims=True)

    def _plan_row(self, gray, x0, y0, row, first, last, pattern, scale):
        """Cells of a row split into literals/blanks and crops that need the classifier."""
        cells = self.cells(gray, x0, y0, row, range(first, last + 1), scale)
        if len(cells) != last - first + 1:
            return None
        literal = {first + i: ch for i, ch in enumerate(pattern or "") if ch != "D"}
        chars = {col: literal.get(col, " ") for col, _ in cells}
        todo = []
        for col, crop in cells:
            if col in literal:
                continue
            core = crop[MARGIN:MARGIN + CELL_H, MARGIN:MARGIN + CELL_W]
            if int((core > INK_THRESHOLD).sum()) >= MIN_INK:
                todo.append((col, crop))
            elif pattern:
                return None  # a digit position must be inked
        return [col for col, _ in cells], chars, todo, pattern

    def _finish_row(self, plan, probs) -> str | None:
        order, chars, todo, pattern = plan
        for (col, _), p in zip(todo, probs):
            if pattern:
                masked = np.zeros_like(p)
                masked[self.digits] = p[self.digits]
                p = masked / max(float(masked.sum()), 1e-9)
            k = int(p.argmax())
            if p[k] < MIN_PROB:
                return None
            chars[col] = self.layout.glyph_chars[k]
        return "".join(chars[col] for col in order)

    def read_row(self, gray: np.ndarray, x0: int, y0: int, row: int, first: int, last: int,
                 pattern: str | None = None, scale: float = 1.0) -> str | None:
        """Text of cells ``first..last``; ``None`` if any inked cell is not confidently classified.

        ``pattern`` constrains fixed-format rows: ``D`` = digit; any other char is a literal that is
        not read at all.
        """
        plan = self._plan_row(gray, x0, y0, row, first, last, pattern, scale)
        if plan is None:
            return None
        probs = self.classify([crop for _, crop in plan[2]]) if plan[2] else []
        return self._finish_row(plan, probs)

    def read(self, gray: np.ndarray, x0: int, y0: int, score: float, scale: float = 1.0,
             with_clock: bool = True) -> OsdReading:
        """All fields (+ the clock) of one frame, classified in a single batched forward pass."""
        rows = [(f.key, 1, f.first_col, min(f.last_col, self.layout.cols - 1), None) for f in self.layout.fields]
        if with_clock:
            rows.append(("clock", self.layout.date_row, 0, 16, CLOCK_PATTERN))
        plans = {key: self._plan_row(gray, x0, y0, row, first, last, pattern, scale)
                 for key, row, first, last, pattern in rows}
        crops = [crop for plan in plans.values() if plan for _, crop in plan[2]]
        probs = self.classify(crops) if crops else np.zeros((0, len(self.layout.glyph_chars)))
        texts: dict[str, str | None] = {}
        offset = 0
        for key, plan in plans.items():
            if plan is None:
                texts[key] = None
                continue
            n = len(plan[2])
            texts[key] = self._finish_row(plan, probs[offset:offset + n])
            offset += n
        values: dict[str, float | None] = {}
        raw: dict[str, str] = {}
        for f in self.layout.fields:
            token = (texts[f.key] or "").strip()
            raw[f.key] = token
            values[f.key] = round(float(token) * f.scale, 4) if NUMBER.match(token) else None
        clock = None
        if with_clock:
            raw["clock"] = texts["clock"] or ""
            clock = parse_clock(texts["clock"], self.layout.displayed_date_offset_days) if texts["clock"] else None
        return OsdReading(score=score, values=values, raw=raw, clock=clock)


def parse_clock(text: str, offset_days: int) -> datetime | None:
    """Parse "MM/DD/YY HH:MM:SS" and undo the documented overlay date error."""
    match = CLOCK.match(text.strip())
    if not match:
        return None
    month, day, year, hour, minute, second = (int(g) for g in match.groups())
    try:
        displayed = datetime(2000 + year, month, day, hour, minute, second)
    except ValueError:
        return None
    return displayed - timedelta(days=offset_days)


def date_check(clocks: list[datetime], expected: date | None) -> dict:
    """Compare the overlay's (corrected) date with the test-matrix date: a built-in OCR audit."""
    if not clocks:
        return {"status": "no-clock", "expected": expected.isoformat() if expected else None, "observed": None}
    days = [c.date() for c in clocks]
    observed = max(set(days), key=days.count)
    status = "unknown" if expected is None else ("match" if observed == expected else "mismatch")
    return {"status": status, "expected": expected.isoformat() if expected else None,
            "observed": observed.isoformat(), "agreement": round(days.count(observed) / len(days), 3)}
