# Pipeline — NASA PSI → app data

Stdlib-only Python (3.10+). Runs locally or in Google Colab unchanged.

```bash
python -I pipeline/build_psi25.py .                 # rebuild public/data/psi-25/*
python -m unittest discover -s pipeline/tests -v    # parser tests
```

- `psi_client.py` — verified public PSI endpoints (metadata, file tree, presigned download).
- `build_psi25.py` — PSI-25 BASS-II → `manifest.json` + `experiments.json` (contract:
  `src/types/experiment.ts`, semantics: `docs/DATA.md`).
- Integrity: never alter source values; null + QA flag + raw cell instead.

**Colab:** clone the repo in a notebook, run the same scripts, write heavy intermediates to the
shared Drive folder ("Nasa Space Apps Data 2026"); promote only small final assets to
`public/data/`. Owner: Codex.

## PSI-25 video metadata and fallback clips

With ffmpeg and ffprobe on PATH, rebuild the base PSI-25 JSON, then run:

```bash
python pipeline/psi25_video.py probe . --cache psi25-video-probes.json
python pipeline/psi25_video.py clips .
python pipeline/psi25_video.py apply . --cache psi25-video-probes.json
```

The probe reads source stream/container headers through NASA's ranged URLs. The probe cache can
be kept outside the repository and reused for failed files. A nonzero probe exit means at least
one source could not be read. The complete cache still records those attempts so `apply` can
publish measured fields and flag missing data. Six PSI-25 v4 MP4s lacked valid headers even after
whole-file download. The v4 catalog published no additional unattached MP4s.

Fallback clips use NASA PSI-25 source footage (DOI 10.60555/4qc4-de67, CC0), beginning at source t=0.
B3, O1 and T1 primary footage is clipped to 12 s and transcoded to H.264 without audio.
