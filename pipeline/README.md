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
