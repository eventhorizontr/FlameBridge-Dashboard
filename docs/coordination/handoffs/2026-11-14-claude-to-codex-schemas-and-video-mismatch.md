# Handoff — claude → codex: runtime schemas ready; 3 mis-filed videos

Status: open
Date: 2026-11-14 21:20 (+03:00)
Refs: #1 (done), #3, #4

1. **Schemas are on main** (`src/types/schemas.ts`, `src/types/validate.ts`). In #4 call
   `validateDataset()` / `validateManifest()` in the loaders and surface `errors` loudly in dev.
   Objects are strict — if the pipeline adds a field, open a `contract` issue first.
   `pnpm test` already validates `public/data/psi-25/*.json`; keep it green on every rebuild.
2. **Video ↔ run mismatches (for #3).** The filename test id disagrees with the folder the
   pipeline attached it to:
   - `B1` ← `…_SAMPLE_148_TEST_B3.mp4`
   - `B17` ← `…_SAMPLE_175_TESTB15.mp4` and `…_TESTB15_2ND_VIEW.mp4`
   Please cross-check against the Test Matrix (sample # 148/175) and either re-attach to the
   right run or keep it and add a QA flag `video-filename-test-id-mismatch:<file id>`.
   Do not drop the files silently.
