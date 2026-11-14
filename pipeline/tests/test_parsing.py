"""Unit tests for PSI-25 cell parsers. Run: python -m unittest discover -s pipeline/tests"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import build_psi25 as b  # noqa: E402


class MaterialParsing(unittest.TestCase):
    def test_thin_film_microns(self):
        m = b.parse_material("100 micron PMMA film   2 cm wide")
        self.assertEqual((m["material"], m["geometry"], m["thicknessMm"], m["widthCm"]), ("PMMA", "film", 0.1, 2.0))

    def test_rod_diameter_and_inference(self):
        m = b.parse_material('3/8" black rod')
        self.assertEqual((m["geometry"], m["diameterMm"], m["color"]), ("rod", 9.525, "black"))
        self.assertTrue(m["inferred"], "rod material must be listed as inferred")

    def test_sibal(self):
        self.assertEqual(b.parse_material("2 cm SIBAL")["material"], "SIBAL")


class OxygenParsing(unittest.TestCase):
    def test_implausible_value_is_nulled_and_flagged(self):
        flags: list[str] = []
        self.assertIsNone(b.parse_o2("40.4", flags, "o2Final"))
        self.assertEqual(len(flags), 1)

    def test_plausible_value_kept(self):
        flags: list[str] = []
        self.assertEqual(b.parse_o2("17.3", flags, "o2Initial"), 17.3)
        self.assertEqual(flags, [])


if __name__ == "__main__":
    unittest.main()
