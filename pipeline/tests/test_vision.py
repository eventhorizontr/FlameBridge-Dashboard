"""Vision layer: deterministic checks on synthetic frames and the published assets.

Needs numpy + opencv-python (``pip install -r pipeline/vision/requirements.txt``); skipped otherwise.
"""
from datetime import date, datetime
from pathlib import Path
import sys
import unittest

VISION = Path(__file__).resolve().parents[1] / "vision"
sys.path.insert(0, str(VISION))

try:
    import cv2
    import numpy as np
except ImportError:  # pragma: no cover - CI without the vision extras
    cv2 = None


@unittest.skipIf(cv2 is None, "opencv/numpy not installed")
class OverlayClock(unittest.TestCase):
    def test_parse_clock_undoes_documented_offset(self):
        from osd import parse_clock
        self.assertEqual(parse_clock("02/20/14 10:09:49", 1), datetime(2014, 2, 19, 10, 9, 49))
        self.assertIsNone(parse_clock("02/30/14 10:09:49", 1))
        self.assertIsNone(parse_clock("garbage", 1))

    def test_date_check_reports_majority_day(self):
        from osd import date_check
        clocks = [datetime(2014, 2, 19, 10, 0, s) for s in range(5)] + [datetime(2014, 2, 18, 1, 0, 0)]
        result = date_check(clocks, date(2014, 2, 19))
        self.assertEqual(result["status"], "match")
        self.assertAlmostEqual(result["agreement"], 5 / 6, places=3)
        self.assertEqual(date_check([], None)["status"], "no-clock")

    def test_reader_reads_rendered_overlay_cells(self):
        """Render glyphs from the label template's font cells is not possible offline, so read a
        cell crop of the real label row: FUEL/AIR/FAN/RAD registration must score ~1 on itself."""
        from osd import OsdReader
        from profiles import PSI25
        reader = OsdReader(PSI25.osd)
        frame = np.zeros((480, 720), np.uint8)
        h, w = reader.label.shape
        frame[30:30 + h, 154:154 + w] = reader.label
        score, x0, y0, scale = reader.register(frame)
        self.assertGreater(score, 0.99)
        self.assertEqual((x0, y0, scale), (158, 32, 1.0))
        self.assertLess(reader.register(np.zeros((480, 720), np.uint8))[0], 0.5)


@unittest.skipIf(cv2 is None, "opencv/numpy not installed")
class Segmentation(unittest.TestCase):
    def setUp(self):
        import segment as seg
        from profiles import SegmentationParams
        self.seg = seg
        self.params = SegmentationParams()
        rng = np.random.default_rng(0)
        self.dark = [np.clip(rng.normal(4, 1.0, (480, 720, 3)), 0, 255).astype(np.uint8) for _ in range(12)]
        exclude = seg.overlay_exclusion((480, 720), (150, 24, 570, 66), self.params)
        self.background = seg.build_background([seg.prepare(f, self.params) for f in self.dark], exclude, self.params)

    def measure(self, frame):
        return self.seg.segment(self.seg.prepare(frame, self.params), frame, self.background, self.params)

    def test_dark_frame_has_no_flame(self):
        m = self.measure(self.dark[0])
        self.assertEqual(m.area_px, 0)
        self.assertIsNone(m.bbox)

    def test_bright_flame_box_and_area(self):
        frame = self.dark[1].copy()
        cv2.ellipse(frame, (360, 260), (80, 30), 0, 0, 360, (200, 120, 255), -1)
        m = self.measure(frame)
        x, y, w, h = m.bbox
        self.assertTrue(270 <= x <= 285 and 225 <= y <= 235, m.bbox)
        self.assertTrue(155 <= w <= 175 and 55 <= h <= 70, m.bbox)
        # Documented bias: the mask includes the ~2 px blurred fringe of bright edges, so a compact
        # 80x30 px flame reads ~15-20 % large. Comparisons between runs use the same method.
        self.assertTrue(1.0 <= m.area_px / (np.pi * 80 * 30) <= 1.22, m.area_px)
        self.assertGreater(m.core_px, 0.8 * m.area_px)

    def test_dim_blue_flame_is_kept(self):
        frame = self.dark[2].copy()
        cv2.ellipse(frame, (300, 300), (60, 25), 0, 0, 360, (24, 12, 14), -1)  # ~20 counts above background
        m = self.measure(frame)
        self.assertGreater(m.area_px, 3000)
        self.assertEqual(m.core_px, 0)

    def test_overlay_band_is_ignored(self):
        frame = self.dark[3].copy()
        cv2.rectangle(frame, (200, 40), (600, 80), (255, 255, 255), -1)
        self.assertEqual(self.measure(frame).area_px, 0)

    def test_remote_reflection_is_not_merged_into_the_flame(self):
        frame = self.dark[4].copy()
        cv2.ellipse(frame, (200, 300), (60, 25), 0, 0, 360, (220, 140, 255), -1)
        cv2.circle(frame, (620, 420), 12, (90, 90, 120), -1)  # small, dimmer, far away
        m = self.measure(frame)
        self.assertLess(m.bbox[0] + m.bbox[2], 300)
        self.assertGreater(m.other_px, 0)

    def test_lit_chamber_is_detected(self):
        lit = np.full((480, 720, 3), 90, np.uint8)
        self.assertGreater(self.seg.lit_level(self.seg.prepare(lit, self.params), self.background), self.params.lit_threshold)
        self.assertLess(self.seg.lit_level(self.seg.prepare(self.dark[5], self.params), self.background), self.params.lit_threshold)


@unittest.skipIf(cv2 is None, "opencv/numpy not installed")
class TimeSeries(unittest.TestCase):
    def test_presence_closes_gaps_and_drops_blips(self):
        from analyze import presence_runs
        hz = 10.0
        area = [0] * 10 + [500] * 30 + [0] * 2 + [500] * 30 + [0] * 10 + [500] * 2 + [0] * 10
        visible = presence_runs(area, hz, 60, 0.5)
        self.assertTrue(visible[10:72].all())  # 0.2 s gap closed
        self.assertFalse(visible[82:84].any())  # 0.2 s blip dropped

    def test_clean_osd_drops_isolated_misreads(self):
        from analyze import clean_osd
        self.assertEqual(clean_osd([5, 5, 7, 5, 5, None, 9, 9]), [5, 5, None, 5, 5, None, 9, 9])

    def test_transient_spike_is_flagged(self):
        from analyze import transient_frames
        area = [2000] * 60 + [20000] * 3 + [2000] * 60
        flagged = transient_frames(area, 10.0, 3.0, 60)
        self.assertTrue(flagged[60:63].all())
        self.assertFalse(flagged[:60].any())
        # flicker of a small flame (300 -> 1500 px) is not a glow
        flicker = [300] * 30 + [1500] * 2 + [300] * 30
        self.assertFalse(transient_frames(flicker, 10.0, 3.0, 60).any())

    def test_novelty_finds_phase_boundary(self):
        from analyze import embedding_summary
        rng = np.random.default_rng(1)
        a = rng.normal(0, 0.05, (60, 16)) + np.eye(16)[0]
        b = rng.normal(0, 0.05, (60, 16)) + np.eye(16)[1]
        times = np.arange(120) * 0.5
        summary = embedding_summary(np.vstack([a, b]), times, grid=32)
        starts = [s["startS"] for s in summary["segments"]]
        self.assertTrue(any(abs(s - 30.0) <= 2.5 for s in starts), starts)

    def test_flicker_requires_a_real_peak(self):
        from analyze import dominant_frequency
        hz = 10.0
        t = np.arange(600) / hz
        area = list(1000 + 300 * np.sin(2 * np.pi * 0.8 * t))
        visible = np.ones(600, bool)
        result = dominant_frequency(area, visible, hz)
        self.assertAlmostEqual(result["hz"], 0.8, delta=0.05)
        noise = list(np.random.default_rng(2).normal(1000, 50, 600))
        self.assertIsNone(dominant_frequency(noise, visible, hz))


class Assets(unittest.TestCase):
    def test_model_and_templates_are_published_with_a_report(self):
        assets = VISION / "assets"
        for name in ("osd-label-row.png", "osd-glyph-cnn.onnx", "osd-glyph-cnn.report.json"):
            self.assertTrue((assets / name).exists(), name)
        import json
        report = json.loads((assets / "osd-glyph-cnn.report.json").read_text(encoding="utf8"))
        self.assertGreaterEqual(report["accuracy"], 0.999)
        self.assertGreater(report["heldOutVideos"], 10)


if __name__ == "__main__":
    unittest.main()
