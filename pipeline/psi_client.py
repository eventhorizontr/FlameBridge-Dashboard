"""
NASA Physical Sciences Informatics (PSI) client.

Reverse-engineered from the public PSI web app (https://psi.nasa.gov/physci/repo).
All endpoints below are public and unauthenticated. Data is CC0 (see investigation
metadata `licenseName`). Stdlib only so it runs unchanged in Google Colab.

Verified endpoints (2026-11-14):
  GET  /geode-py/ws/studies                                   -> list of accessions
  GET  /geode-py/ws/repo/investigations/{ACCESSION}           -> full metadata + file list ("added")
  POST /geode-py/ws/files/v2  {"folder":"","fileType":"study","studyId":ACC,"version":V}
                                                              -> file tree; leaf nodes carry "id"
  GET  /geode-py/ws/studies/{ACCESSION}/download?file={id}&version={V}&redirect=false
                                                              -> presigned S3 URL (text, quoted)
V is the *study* version (metadata["version"]). Presigned URLs expire: resolve on demand
(the web app does this in /api/psi/file/[id]), never store them.
"""

from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

BASE = "https://psi.nasa.gov/geode-py/ws"
USER_AGENT = "fire-in-freefall-pipeline/0.1 (NASA Space Apps 2026)"


def _get(url: str, *, timeout: int = 60, retries: int = 3) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001 - network layer, retry everything
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"GET failed after {retries} attempts: {url}") from last


def list_accessions() -> list[str]:
    return json.loads(_get(f"{BASE}/studies"))["content"]


def get_investigation(accession: str) -> dict[str, Any]:
    return json.loads(_get(f"{BASE}/repo/investigations/{accession}"))


@dataclass(frozen=True)
class PsiFile:
    accession: str
    id: str  # node id accepted by the /download endpoint
    version: int
    key: str  # s3 key, e.g. "psi-data/PSI-25/Raw Data/....mp4"
    category: str  # e.g. "Raw Data", "Science Documents"
    subcategory: str  # e.g. "Reduced Gravity/ Bhattacharjee/B1"
    size_bytes: int

    @property
    def file_name(self) -> str:
        return self.key.rsplit("/", 1)[-1]

    @property
    def ext(self) -> str:
        return os.path.splitext(self.file_name)[1].lower()


def _post_json(url: str, body: dict[str, Any], timeout: int = 120) -> Any:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def list_files(accession: str, study_version: int) -> list[PsiFile]:
    """Flatten the PSI file tree (POST /files/v2). Returns every downloadable file."""
    tree = _post_json(
        f"{BASE}/files/v2",
        {"folder": "", "fileType": "study", "studyId": accession, "version": study_version},
    )
    out: list[PsiFile] = []

    def walk(node: dict[str, Any]) -> None:
        for child in node.get("files") or []:
            if child.get("directory") or child.get("files"):
                walk(child)
            elif child.get("id") and child.get("visible", True):
                key = child["key"]
                parts = key.split("/")
                out.append(
                    PsiFile(
                        accession=accession,
                        id=child["id"],
                        version=int(child.get("version") or 1),
                        key=key,
                        category=parts[2] if len(parts) > 3 else "",
                        subcategory=child.get("subcategory") or "",
                        size_bytes=int(float(child.get("bytes_size") or 0)),
                    )
                )

    walk(tree)
    return out


def presigned_url(accession: str, file_id: str, study_version: int) -> str:
    """Short-lived S3 URL. Resolve right before use; never persist it."""
    q = urllib.parse.urlencode({"file": file_id, "version": study_version, "redirect": "false"})
    return _get(f"{BASE}/studies/{accession}/download?{q}").decode().strip().strip('"')


def download(f: PsiFile, dest_dir: str, study_version: int) -> str:
    """Download one file (idempotent: skips files already present with the right size)."""
    os.makedirs(dest_dir, exist_ok=True)
    target = os.path.join(dest_dir, f.file_name)
    if os.path.exists(target) and os.path.getsize(target) == f.size_bytes:
        return target
    url = presigned_url(f.accession, f.id, study_version)
    with open(target, "wb") as fh:
        fh.write(_get(url, timeout=600))
    return target
