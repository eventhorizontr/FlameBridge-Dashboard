"""Tests for the PSI-20 source-granularity mapping."""
from pathlib import Path
import sys
import unittest

PIPELINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE))
from build_psi20 import build_rows  # noqa: E402


class Psi20Summary(unittest.TestCase):
    def test_published_rows_preserve_granularity_and_raw_cells(self):
        table = next((PIPELINE.parent / "data" / "raw" / "psi-20").glob("*Experimental table*.csv"))
        rows = {row["date"]: row for row in build_rows(table, "James Quintiere")}
        self.assertEqual(len(rows), 18)
        first = rows["2019-02-08"]
        self.assertEqual(first["id"], "PSI-20:2019-02-08")
        self.assertEqual(first["gmtDay"], 39)
        self.assertEqual(first["raw"]["Flames Ignited"], "10")
        self.assertEqual(first["raw"]["Oxygen Conc (percent)"], "21; 26.5; 40")
        self.assertIsNone(first["conditions"]["o2InitialPct"])
        self.assertEqual(first["videos"], [])
        self.assertFalse(any("malformed" in flag for flag in first["qa"]["flags"]))
        for day, value in [("2019-03-07", "3400%"), ("2019-04-01", "2100%")]:
            self.assertEqual(rows[day]["raw"]["Oxygen Conc (percent)"], value)
            self.assertTrue(any("malformed" in flag for flag in rows[day]["qa"]["flags"]))


if __name__ == "__main__":
    unittest.main()
