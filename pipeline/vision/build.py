"""Build the vision layer for an investigation: every video -> public/data/<acc>/vision/.

    python pipeline/vision/build.py --data public/data/psi-25 --cache <video cache> [--workers 12]
                                    [--only B1,O3a] [--force] [--embed]

Phase 1 (CPU, parallel): ``analyze.py`` per video -> ``<videoId>.json`` (series, telemetry, events),
``<videoId>.contours.json`` (flame polygons, loaded lazily by the viewer) and a keyframe sprite in
``frames/``. Phase 2 (``--embed``, GPU): DINOv2 embeddings -> contextual similarity, recurrence and
scene segments patched into each ``<videoId>.json``. Finally ``index.json`` summarises every video.

Outputs are reproducible: same inputs + same algorithm version -> same files; already built videos
are skipped unless ``--force`` (or the algorithm version changed).
"""
from __future__ import annotations

import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import pickle
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))

ANALYSED_KINDS = ("primary", "still-sequence", "second-view")


def jobs_for(data_dir: Path, only: set[str] | None) -> list[tuple[dict, dict]]:
    dataset = json.loads((data_dir / "experiments.json").read_text(encoding="utf8"))
    out = []
    for experiment in dataset["experiments"]:
        if only and experiment["testId"] not in only:
            continue
        for video in experiment.get("videos") or []:
            if video.get("ext", "").lower() == ".mp4" and video.get("kind") in ANALYSED_KINDS:
                out.append((experiment, video))
    # long videos first so the pool finishes evenly
    out.sort(key=lambda job: -(job[1].get("durationS") or 0))
    return out


def run_one(args: tuple) -> tuple[str, str, float]:
    experiment, video, cache, out_dir, embed_dir, accession = args
    import cv2  # noqa: F401  (imported in the worker)
    from analyze import ALGORITHM_VERSION, analyze
    from profiles import profile_for

    cv2.setNumThreads(1)
    started = time.time()
    path = Path(cache) / f"{video['id']}.mp4"
    out_dir = Path(out_dir)
    if not path.exists():
        result = {"schemaVersion": 1, "accession": accession, "experimentId": experiment["id"],
                  "videoId": video["id"], "kind": video.get("kind"), "fileName": video.get("fileName"),
                  "algorithm": {"name": "fif-flame-vision", "version": ALGORITHM_VERSION},
                  "status": "missing", "reason": "Video not in the local cache when the layer was built."}
        sink = None
    else:
        sink: list | None = [] if video.get("kind") != "second-view" else None
        result = analyze(path, profile=profile_for(accession), experiment=experiment, video=video,
                         keyframe_path=out_dir / "frames" / f"{video['id']}.webp", embed_sink=sink)
    contours = result.pop("contours", None)
    previous = out_dir / f"{video['id']}.json"
    if result.get("status") == "ok" and previous.exists():
        # DINOv2 embeddings depend only on the frames (overlay blanked), not on segmentation: keep them
        try:
            old = json.loads(previous.read_text(encoding="utf8"))
            same_box = (old.get("segmentation") or {}).get("overlayBox") == (result.get("segmentation") or {}).get("overlayBox")
            if old.get("embedding") and same_box:
                result["embedding"] = old["embedding"]
        except ValueError:
            pass
    write_json(out_dir / f"{video['id']}.json", result)
    if contours is not None:
        write_json(out_dir / f"{video['id']}.contours.json",
                   {"videoId": video["id"], "t": result["series"]["t"], "units": "permille of frame width/height",
                    "polygons": contours})
    if sink:
        Path(embed_dir).mkdir(parents=True, exist_ok=True)
        with open(Path(embed_dir) / f"{video['id']}.pkl", "wb") as handle:
            pickle.dump(sink, handle, protocol=pickle.HIGHEST_PROTOCOL)
    return video["id"], result.get("status", "?"), time.time() - started


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
    tmp.replace(path)


def up_to_date(out_dir: Path, video_id: str, version: str) -> bool:
    path = out_dir / f"{video_id}.json"
    if not path.exists():
        return False
    try:
        data = json.loads(path.read_text(encoding="utf8"))
    except ValueError:
        return False
    return data.get("algorithm", {}).get("version") == version and data.get("status") != "missing"


def rekey_one(args: tuple) -> str:
    """Regenerate the keyframe sprite of one analysed video from its stored series."""
    json_path, cache = args
    import numpy as np
    from analyze import write_keyframes
    data = json.loads(Path(json_path).read_text(encoding="utf8"))
    if data.get("status") != "ok":
        return "skip"
    video = Path(cache) / f"{data['videoId']}.mp4"
    if not video.exists():
        return "missing"
    s = data["series"]
    fps = data["source"]["fps"]
    flags = s.get("flags") or [0] * len(s["t"])
    rows = [{"i": int(round(t * fps)), "valid": bool(v), "lit": bool(f & 1)} for t, v, f in zip(s["t"], s["valid"], flags)]
    visible = np.array([bool(v) for v in s["visible"]])
    data["keyframes"] = write_keyframes(video, Path(json_path).parent / "frames" / f"{data['videoId']}.webp", rows, visible, fps)
    write_json(Path(json_path), data)
    return "ok"


POSTER = (360, 240)


def poster_one(args: tuple) -> str:
    """Flame poster: the steady peak frame cropped around the flame (padded, 3:2), full resolution."""
    json_path, cache = args
    import cv2
    data = json.loads(Path(json_path).read_text(encoding="utf8"))
    if data.get("status") != "ok" or data["events"].get("peakAreaS") is None:
        return "skip"
    video = Path(cache) / f"{data['videoId']}.mp4"
    if not video.exists():
        return "missing"
    s = data["series"]
    t = data["events"]["peakAreaS"]
    i = min(range(len(s["t"])), key=lambda k: abs(s["t"][k] - t))
    if s["bboxX"][i] is None:
        return "skip"
    x, y, w, h = s["bboxX"][i], s["bboxY"][i], s["bboxW"][i], s["bboxH"][i]
    W, H = data["source"]["width"], data["source"]["height"]
    cx, cy = x + w / 2, y + h / 2
    cw = max(w * 1.6, h * 1.6 * 1.5, 120.0)
    ch = cw / 1.5
    if ch > H:
        ch, cw = H, H * 1.5
    if cw > W:
        cw, ch = W, W / 1.5
    x0 = int(min(max(cx - cw / 2, 0), W - cw))
    y0 = int(min(max(cy - ch / 2, 0), H - ch))
    cap = cv2.VideoCapture(str(video))
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(s["t"][i] * data["source"]["fps"])))
    ok, frame = cap.read()
    cap.release()
    if not ok:
        return "unreadable"
    crop = frame[y0:y0 + int(ch), x0:x0 + int(cw)]
    out = Path(json_path).parent / "frames" / f"{data['videoId']}.poster.webp"
    cv2.imwrite(str(out), cv2.resize(crop, POSTER, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 80])
    data["poster"] = {"file": out.name, "t": s["t"][i], "crop": [x0, y0, int(cw), int(ch)]}
    write_json(Path(json_path), data)
    return "ok"


def build_index(data_dir: Path, out_dir: Path, accession: str) -> dict:
    from analyze import ALGORITHM_VERSION
    from profiles import profile_for

    dataset = json.loads((data_dir / "experiments.json").read_text(encoding="utf8"))
    videos = []
    for experiment in dataset["experiments"]:
        for video in experiment.get("videos") or []:
            path = out_dir / f"{video['id']}.json"
            if not path.exists():
                continue
            d = json.loads(path.read_text(encoding="utf8"))
            entry = {
                # a file can be filed under several tests: index it under each of them
                "videoId": d["videoId"], "experimentId": experiment["id"], "kind": video.get("kind"),
                "status": d.get("status"), "reason": d.get("reason"),
                "durationS": (d.get("source") or {}).get("durationS"),
                "hasContours": (out_dir / f"{video['id']}.contours.json").exists(),
                "hasKeyframes": bool(d.get("keyframes")),
                "keyframes": d.get("keyframes"),
                "poster": d.get("poster"),
                "hasEmbedding": bool(d.get("embedding")),
            }
            if d.get("status") == "ok":
                osd = d.get("osd") or {}
                entry.update({
                    "coverage": d["coverage"], "events": d["events"], "summary": d["summary"],
                    "osd": {"readRate": osd.get("readRate"), "dateCheck": (osd.get("dateCheck") or {}).get("status"),
                            "clockAtVideoStart": (osd.get("clock") or {}).get("clockAtVideoStart"),
                            "radMax": max((v for v in (osd.get("series") or {}).get("rad", []) if v is not None), default=None),
                            "airValues": sorted({v for v in (osd.get("series") or {}).get("air", []) if v is not None})}
                    if osd else None,
                    "segments": len((d.get("embedding") or {}).get("segments") or []) or None,
                })
            videos.append(entry)
    profile = profile_for(accession)
    counts: dict[str, int] = {}
    for v in videos:
        counts[v["status"]] = counts.get(v["status"], 0) + 1
    index = {
        "schemaVersion": 1,
        "accession": accession,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "algorithm": {"name": "fif-flame-vision", "version": ALGORITHM_VERSION},
        "profile": profile.to_json(),
        "counts": counts,
        "videos": videos,
    }
    write_json(out_dir / "index.json", index)
    return index


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--embed-cache", type=Path, default=None)
    parser.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 2))
    parser.add_argument("--only", default="", help="comma-separated test ids")
    parser.add_argument("--videos", default="", help="comma-separated video ids (implies --force for them)")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--embed", action="store_true", help="run the GPU DINOv2 pass afterwards")
    parser.add_argument("--index-only", action="store_true")
    parser.add_argument("--rekey", action="store_true", help="only regenerate keyframe sprites from stored series")
    parser.add_argument("--posters", action="store_true", help="only write flame posters (peak crop) from stored series")
    args = parser.parse_args()

    from analyze import ALGORITHM_VERSION

    dataset = json.loads((args.data / "experiments.json").read_text(encoding="utf8"))
    accession = dataset["accession"]
    out_dir = args.out or (args.data / "vision")
    embed_dir = args.embed_cache or (args.cache.parent / "embed-frames" / accession.lower())
    if args.posters:
        files = [str(p) for p in sorted(out_dir.glob("*.json")) if not p.name.endswith(".contours.json")
                 and p.name not in ("index.json", "frame-index.json")]
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            done = list(pool.map(poster_one, [(f, str(args.cache)) for f in files]))
        print(f"posters: {done.count('ok')}", flush=True)
    elif args.rekey:
        files = [str(p) for p in sorted(out_dir.glob("*.json")) if not p.name.endswith(".contours.json") and p.name != "index.json"]
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            done = list(pool.map(rekey_one, [(f, str(args.cache)) for f in files]))
        print(f"rekeyed {done.count('ok')} sprites", flush=True)
    elif not args.index_only:
        only = {x.strip() for x in args.only.split(",") if x.strip()} or None
        wanted = {x.strip() for x in args.videos.split(",") if x.strip()}
        jobs = [(e, v) for e, v in jobs_for(args.data, only)
                if ((v["id"] in wanted) if wanted else (args.force or not up_to_date(out_dir, v["id"], ALGORITHM_VERSION)))]
        seen: set[str] = set()
        jobs = [j for j in jobs if not (j[1]["id"] in seen or seen.add(j[1]["id"]))]  # a file can serve several tests
        print(f"{len(jobs)} videos to analyse with {args.workers} workers -> {out_dir}", flush=True)
        started = time.time()
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(run_one, (e, v, str(args.cache), str(out_dir), str(embed_dir), accession))
                       for e, v in jobs]
            for n, future in enumerate(as_completed(futures), 1):
                try:
                    video_id, status, seconds = future.result()
                    print(f"[{n}/{len(jobs)}] {status:24} {video_id} {seconds:6.1f}s "
                          f"(elapsed {(time.time() - started) / 60:.1f} min)", flush=True)
                except Exception as exc:  # noqa: BLE001 - keep the batch going, report the failure
                    print(f"[{n}/{len(jobs)}] ERROR {exc!r}", flush=True)
        if args.embed:
            from embed import embed_all
            embed_all(out_dir, embed_dir)
    index = build_index(args.data, out_dir, accession)
    print(json.dumps(index["counts"]), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
