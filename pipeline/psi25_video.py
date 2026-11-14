"""Probe the PSI-25 MP4s with ffprobe and create three bounded demo clips."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction
import json
from pathlib import Path
import subprocess

import psi_client as psi

ACCESSION = "PSI-25"
CLIPS = {
    "B3": "6924803a7f6aa6a8302103cf",
    "O1": "692480467f6aa6a8302104a8",
    "T1": "6924804b7f6aa6a830210502",
}


def ffprobe(url: str) -> dict:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-rw_timeout", "12000000", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,avg_frame_rate,duration:format=duration", "-of", "json", url],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode:
        raise ValueError("ffprobe could not read the source video")
    output = json.loads(result.stdout)
    stream = output["streams"][0]
    fps = stream.get("avg_frame_rate")
    duration = stream.get("duration", output["format"].get("duration"))
    return {
        "durationS": float(duration) if duration and duration != "N/A" else None,
        "fps": float(Fraction(fps)) if fps and fps != "0/0" else None,
        "width": stream.get("width") or None,
        "height": stream.get("height") or None,
    }


def probe(file_id: str, version: int) -> tuple[str, dict | None]:
    for _ in range(2):
        try:
            return file_id, ffprobe(psi.presigned_url(ACCESSION, file_id, version))
        except (RuntimeError, ValueError, KeyError, IndexError, OSError, subprocess.SubprocessError):
            continue
    return file_id, None


def build_clips(destination: Path, version: int) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for run, file_id in CLIPS.items():
        url = psi.presigned_url(ACCESSION, file_id, version)
        target = destination / f"psi25-{run.lower()}.mp4"
        temporary = target.with_suffix(".tmp.mp4")
        try:
            subprocess.run(
                ["ffmpeg", "-v", "error", "-nostdin", "-y", "-rw_timeout", "15000000",
                 "-i", url, "-t", "12", "-map", "0:v:0", "-an", "-vf", "scale=640:-2",
                 "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-movflags",
                 "+faststart", "-crf", "24", "-maxrate", "1800k", "-bufsize", "3600k",
                 str(temporary)],
                capture_output=True, check=True, timeout=90,
            )
            if temporary.stat().st_size >= 5_000_000 or not ffprobe(str(temporary))["durationS"]:
                raise ValueError(f"Invalid demo clip: {run}")
            temporary.replace(target)
        except subprocess.SubprocessError:
            raise RuntimeError(f"Unable to transcode demo clip for {run}") from None
        finally:
            temporary.unlink(missing_ok=True)


def enrich_data(data: Path, cache: Path, clips: Path) -> None:
    manifest_path = data / "manifest.json"
    dataset_path = data / "experiments.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf8"))
    dataset = json.loads(dataset_path.read_text(encoding="utf8"))
    metadata = json.loads(cache.read_text(encoding="utf8"))
    fallback = {
        file_id: f"/media/psi25-{run.lower()}.mp4"
        for run, file_id in CLIPS.items()
        if (clips / f"psi25-{run.lower()}.mp4").is_file()
    }
    attached = {video["id"] for run in dataset["experiments"] for video in run["videos"]}
    files = {f["id"]: f for group in manifest["groups"].values() for f in group if f["ext"] == ".mp4"}
    if missing := attached - files.keys():
        raise ValueError(f"Dataset references video IDs outside the manifest: {sorted(missing)}")
    if absent := files.keys() - metadata.keys():
        raise ValueError(f"Probe cache does not cover {len(absent)} cataloged MP4s")

    def enrich(file: dict) -> None:
        for key in ("durationS", "fps", "width", "height", "fallbackHref"):
            file.pop(key, None)
        probe_result = metadata[file["id"]] or {}
        file.update({key: value for key, value in probe_result.items() if value is not None})
        if file["id"] in fallback:
            file["fallbackHref"] = fallback[file["id"]]

    for file in files.values():
        enrich(file)
    for run in dataset["experiments"]:
        run["qa"]["flags"] = [
            flag for flag in run["qa"]["flags"] if not flag.startswith("video-metadata-unavailable:")
        ]
        for video in run["videos"]:
            enrich(video)
            if metadata[video["id"]] is None:
                run["qa"]["flags"].append(f"video-metadata-unavailable:{video['id']}")
    manifest["miscVideos"] = sorted(files.keys() - attached)
    for path, payload in [(manifest_path, manifest), (dataset_path, dataset)]:
        payload["schemaVersion"] = "0.2.0"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"PSI-25 MP4 index: {len(attached)} attached, {len(manifest['miscVideos'])} unattached")

def main(root: Path, mode: str, workers: int, cache: Path | None) -> None:
    data = root / "public" / "data" / "psi-25"
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf8"))
    version = manifest["studyVersion"]
    clips = root / "public" / "media"
    if mode == "clips":
        build_clips(clips, version)
        return
    if cache is None:
        raise ValueError("Provide a cache path for probe or apply")
    if mode == "apply":
        enrich_data(data, cache, clips)
        return
    files = {f["id"]: f for group in manifest["groups"].values() for f in group if f["ext"] == ".mp4"}
    existing = json.loads(cache.read_text(encoding="utf8")) if cache.exists() else {}
    metadata = {key: value for key, value in existing.items() if key in files and value is not None}
    pending = sorted(set(files) - metadata.keys())
    with ThreadPoolExecutor(workers) as pool:
        metadata.update(pool.map(lambda file_id: probe(file_id, version), pending))
    cache.write_text(json.dumps(metadata, indent=1) + "\n", encoding="utf8")
    succeeded = sum(meta is not None for meta in metadata.values())
    print(f"PSI-25 MP4 probes: {succeeded}/{len(files)} successful")
    if succeeded != len(files):
        raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["probe", "clips", "apply"])
    parser.add_argument("root", type=Path, nargs="?", default=Path.cwd())
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    main(args.root, args.mode, args.workers, args.cache)
