"""Mirror the investigation's MP4s into a local cache for vision analysis.

Usage:
    python -I pipeline/vision/fetch.py --data public/data/psi-25 --cache <dir> [--kinds primary,second-view] [--workers 8]

Files are written as ``<cache>/<videoId>.mp4``; a download goes to ``.part`` first and is only
renamed once its byte count matches the PSI catalogue, so an interrupted run resumes cleanly.
Presigned URLs are resolved right before use and never persisted.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import sys
import time
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import psi_client as psi  # noqa: E402

KIND_ORDER = {"primary": 0, "second-view": 1, "still-sequence": 2}
CHUNK = 1 << 20


def video_jobs(data_dir: Path, kinds: set[str]) -> list[dict]:
    dataset = json.loads((data_dir / "experiments.json").read_text(encoding="utf8"))
    manifest = json.loads((data_dir / "manifest.json").read_text(encoding="utf8"))
    jobs = []
    for experiment in dataset["experiments"]:
        for video in experiment.get("videos") or []:
            if video.get("ext", "").lower() != ".mp4" or video.get("kind") not in kinds:
                continue
            jobs.append({
                "accession": dataset["accession"],
                "version": int(manifest.get("studyVersion") or 1),
                "id": video["id"],
                "size": int(video.get("sizeBytes") or 0),
                "kind": video["kind"],
                "experimentId": experiment["id"],
            })
    jobs.sort(key=lambda job: (KIND_ORDER.get(job["kind"], 9), job["experimentId"]))
    return jobs


def fetch_one(job: dict, cache: Path) -> tuple[str, str]:
    target = cache / f"{job['id']}.mp4"
    if target.exists() and (not job["size"] or target.stat().st_size == job["size"]):
        return job["id"], "cached"
    partial = target.with_suffix(".part")
    for attempt in range(4):
        try:
            url = psi.presigned_url(job["accession"], job["id"], job["version"])
            request = urllib.request.Request(url, headers={"User-Agent": psi.USER_AGENT})
            with urllib.request.urlopen(request, timeout=120) as response, open(partial, "wb") as handle:
                while chunk := response.read(CHUNK):
                    handle.write(chunk)
            if job["size"] and partial.stat().st_size != job["size"]:
                raise OSError(f"size mismatch {partial.stat().st_size} != {job['size']}")
            partial.replace(target)
            return job["id"], "downloaded"
        except Exception:  # noqa: BLE001 - network layer, retry everything
            time.sleep(2 * (attempt + 1))
    try:
        partial.unlink(missing_ok=True)
    except OSError:  # Windows: a scanner may still hold the file; the next run overwrites it
        pass
    return job["id"], "failed"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--kinds", default="primary,second-view,still-sequence")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    args.cache.mkdir(parents=True, exist_ok=True)
    jobs = video_jobs(args.data, set(args.kinds.split(",")))
    total = sum(job["size"] for job in jobs)
    print(f"{len(jobs)} videos, {total / 1e9:.2f} GB -> {args.cache}", flush=True)
    done = failed = 0
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(fetch_one, job, args.cache): job for job in jobs}
        for future in as_completed(futures):
            video_id, status = future.result()
            done += 1
            failed += status == "failed"
            if status != "cached" or done == len(jobs):
                elapsed = max(time.time() - started, 1e-6)
                print(f"[{done}/{len(jobs)}] {status:10} {futures[future]['experimentId']:14} {video_id} "
                      f"({elapsed / 60:.1f} min)", flush=True)
    print(f"done: {done - failed} ok, {failed} failed", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
