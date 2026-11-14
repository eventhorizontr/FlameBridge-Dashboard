"""Regression checks against the published PSI-25 CSV and Test Matrix."""
from pathlib import Path
import sys
import unittest

PIPELINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE))
from build_psi25 import build_experiments, parse_plain  # noqa: E402


class MatrixReconciliation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = PIPELINE.parent / "data" / "raw" / "psi-25"
        rows, _ = build_experiments(
            next(raw.glob("*Experimental table*.csv")), next(raw.glob("*Test.Matrices.xlsx")), {},
        )
        cls.rows = {row["testId"]: row for row in rows}

    def test_run_order_and_mixed_fan_units(self):
        cases = {
            "O13a": [5, 2, 0],
            "M10": [10, 17, 14, 10, 8],
            "M19": [10, 17, 14, 10, 7, 5],
            "O5a": [5, 10, 5, 2, 0],
            "O5b": [5],
            "B16": [3],
            "B17": [5, 3],
            "P10": [5],
            "T21": [11, 47],
            "T29": [5],
        }
        for test_id, points in cases.items():
            with self.subTest(test_id=test_id):
                self.assertEqual(self.rows[test_id]["conditions"]["airflowSetpointsCmS"], points)

    def test_implausible_oxygen_and_operator_evidence(self):
        for test_id in ("B2", "P22a", "P22b", "T28a", "T28b"):
            with self.subTest(test_id=test_id):
                row = self.rows[test_id]
                self.assertIsNone(row["conditions"]["o2FinalPct"])
                self.assertTrue(any(f.startswith("o2Final:") for f in row["qa"]["flags"]))
        self.assertEqual(self.rows["P22a"]["outcomeHints"], ["ext"])
        self.assertEqual(self.rows["P22b"]["outcomeHints"], ["ext"])
        self.assertEqual(self.rows["T28a"]["outcomeHints"], [])

    def test_co_lower_bound_distinct_from_sensor_over_range(self):
        conditions = self.rows["M5"]["conditions"]
        self.assertEqual(conditions["coFinalLowerBoundPpm"], 500)
        self.assertIsNone(conditions["coFinalPpm"])
        flags = []
        self.assertIsNone(parse_plain("OR", flags, "coFinal"))
        self.assertIn("sensor over range", flags[0])

    def test_source_discrepancies_and_dates_remain_visible(self):
        row = self.rows["T1"]
        self.assertEqual(row["fuel"]["material"], "SIBAL")
        self.assertTrue(any("CSV '2 cm SIBAL'" in f and "Test Matrix" in f for f in row["qa"]["flags"]))
        for test_id in ("T9", "T18"):
            self.assertEqual(self.rows[test_id]["date"], "2018-06-24")
            self.assertTrue(any(f.startswith("date:") for f in self.rows[test_id]["qa"]["flags"]))


if __name__ == "__main__":
    unittest.main()
