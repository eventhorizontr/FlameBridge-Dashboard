"""Read the published BASS-II Test Matrix without a third-party XLSX dependency."""
from datetime import datetime, timedelta
from pathlib import Path
import posixpath
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

XLS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
# Excel A:P mapped to the corresponding CSV column; the PI is the sheet name.
CSV_COLUMNS = (2, 3, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)


def read_matrix(path: Path) -> dict[str, tuple[str, tuple[str, ...]]]:
    result: dict[str, tuple[str, tuple[str, ...]]] = {}
    with ZipFile(path) as workbook:
        def xml(name: str) -> ET.Element:
            return ET.fromstring(workbook.read(name))

        def text(element: ET.Element) -> str:
            return "".join(node.text or "" for node in element.iter(XLS + "t"))

        strings = [text(item) for item in xml("xl/sharedStrings.xml")]
        targets = {
            rel.attrib["Id"]: posixpath.join("xl", rel.attrib["Target"])
            for rel in xml("xl/_rels/workbook.xml.rels")
        }
        for sheet in xml("xl/workbook.xml").iter(XLS + "sheet"):
            pi = sheet.attrib["name"]
            for row in xml(targets[sheet.attrib[REL + "id"]]).iter(XLS + "row"):
                if row.attrib["r"] == "1":
                    continue
                cells: dict[str, str] = {}
                for cell in row:
                    column = re.match(r"[A-Z]+", cell.attrib.get("r", ""))
                    if column is None:
                        continue
                    value = cell.findtext(XLS + "v", "")
                    kind = cell.get("t")
                    if kind == "s":
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = text(cell)
                    cells[column.group()] = value
                test_id = cells.get("C", "").strip()
                if not re.fullmatch(r"[A-Z]\d+[ab]?", test_id):
                    continue
                if test_id in result:
                    raise ValueError(f"Duplicate Test Matrix test ID: {test_id}")
                a = cells.get("A", "")
                if re.fullmatch(r"\d+(?:\.0+)?", a):
                    date = datetime(1899, 12, 30) + timedelta(days=float(a))
                    cells["A"] = f"{date.month}/{date.day}/{date.year}"
                result[test_id] = pi, tuple(cells.get(chr(65 + i), "") for i in range(16))
    return result


def cell_key(value: str) -> str:
    # CSV exports remove separator commas and use multiple spaces in their place.
    return re.sub(r"[\s,]+", " ", value.strip().casefold()).strip()


def discrepancies(header: list[str], row: list[str], pi: str, cells: tuple[str, ...]) -> dict[int, str]:
    result: dict[int, str] = {}
    for index, matrix in [(0, pi), *zip(CSV_COLUMNS, cells)]:
        csv = row[index]
        a, b = cell_key(csv), cell_key(matrix)
        if index == 5:
            # Treat harmless case, whitespace and inch-mark formatting as equivalent.
            a, b = a.replace('"', ""), b.replace('"', "")
        try:
            same_number = float(a) == float(b)
        except ValueError:
            same_number = False
        if a != b and not same_number:
            result[index] = (
                f"{header[index].strip()}: CSV {csv!r} differs from "
                f"Test Matrix ({pi} {row[1]}) {matrix!r}"
            )
    return result


def parse_airflow(test_id: str, raw: str, flags: list[str]) -> list[float]:
    """Extract explicit air speeds only, in recorded order, from the Matrix Air display."""
    if test_id == "O13a":
        # Olson O13a records fan voltage ×10 first and the air speeds inside parentheses.
        raw = raw.partition("(")[2].partition(")")[0]
    elif test_id == "T21":
        # T'ien T21 explicitly uses parentheses for the maximum measured airflow.
        raw = re.sub(r"max\((\d+(?:\.\d+)?)\)", r"\1", raw, flags=re.I)
    else:
        # Other parenthesized numbers in the air column are fan/pot annotations.
        # Retain an early (brief) annotation as plain text, which contains no values.
        raw = re.sub(r"(\d+(?:\.\d+)?)\s*\(\s*\?\s*\)", r"\1?", raw)
        raw = re.sub(r"\([^)]*\)", "", raw)
    if test_id == "O5b":
        # Olson O5b gives fan display 49 then explicitly labels 5 cm/s.
        raw = re.sub(r"^\s*49[\s,]+", "", raw)
    if re.search(r"\bpots?\b", raw, re.I):
        flags.append("airflow: pot settings in Air display excluded (Test Matrix)")
        raw = re.split(r"\bpots?\b", raw, maxsplit=1, flags=re.I)[0]
        raw = re.sub(r"\d+(?:\.\d+)?\s*$", "", raw) if test_id == "B16" else raw
    if test_id == "T17":
        # No fan entry and '6, 53' in the Air display; 53 could be either unit.
        raw = raw.partition(",")[0]
        flags.append("airflow: ambiguous '53' in Test Matrix Air display, excluded")
    if re.search(r"(?:<|approaching)\s*\d|\d\s*(?:\(\s*)?\?", raw, re.I):
        flags.append("airflow: bounded or uncertain Air display value excluded (Test Matrix)")
    raw = re.sub(r"(?:<|approaching)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*\?", "", raw, flags=re.I)
    return [float(value) for value in re.findall(r"(?<![\d.])\d+(?:\.\d+)?(?![\d.])", raw)]


def notes(fan: str, air: str) -> list[str]:
    text = f"{fan} {air}"
    patterns = {
        "ext": r"\bext(?:inguish(?:ed|ment)?|inction)?\b",
        "blowoff": r"\bblow[ -]?off\b",
        "no ign": r"\bno ign(?:ition)?\b",
    }
    return sorted(label for label, pattern in patterns.items() if re.search(pattern, text, re.I))
