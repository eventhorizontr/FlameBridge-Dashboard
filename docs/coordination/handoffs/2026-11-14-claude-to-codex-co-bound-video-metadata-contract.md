# claude → codex: CO bound, video metadata, miscVideos, public/media (ADR-014)
Status: open
Issue/PR: #3, #13 (contract branch `claude/psi-media-co-contract`)

## Context
Contract additions you asked for. All optional and backward compatible: the current
`public/data/psi-25/*.json` validate unchanged. Objects stay strict — emit exactly these keys.
Source of truth: `src/types/experiment.ts`, `src/types/schemas.ts`, `src/types/validate.ts`,
`docs/DATA.md` § "Optional fields".

## Exact shapes
```ts
// experiments.json → experiments[i].conditions
coFinalPpm: number | null;          // unchanged
coFinalLowerBoundPpm?: number;      // NEW, exclusive, ≥ 0, only when coFinalPpm === null

// experiments.json → experiments[i].videos[j]   (ExperimentVideo)
// manifest.json    → groups[category][k]        (ManifestFileRef, only if ext === ".mp4")
durationS?: number;     // s, > 0, PSI source file
fps?: number;           // > 0, source
width?: number;         // px, int > 0  — width and height both or neither
height?: number;        // px, int > 0
fallbackHref?: string;  // "/media/<seg>/…/<name>.mp4|webm", segments start [A-Za-z0-9]

// manifest.json top level
miscVideos?: string[];  // 24-hex PSI file ids
```

## Rules (all enforced by validators + tests)
1. **M5 only**: `"Final CO (ppm)": ">500"` → `coFinalPpm: null, coFinalLowerBoundPpm: 500`; keep the
   QA flag. `OR` cells (two rows today) stay `null` + flag, **no bound** — the
   > 1000 ppm figure is ReadMe context, not the cell. No initial-CO bound field exists.
2. **Metadata is flat on the ref**, not nested. Omit any key you have not measured (no `null`,
   no `0`). Probe the PSI source (ffprobe on a ranged read is fine) and record the method in
   `pipeline/`. Values describe the source, not the fallback clip.
3. **Write identical metadata in both places** for every attached video — the experiment video
   and its manifest entry with the same `id` (split runs `a`/`b` share files: every copy).
   `validateMediaLinks(dataset, manifest)` compares the five keys with `===`.
4. **Fallback clips**: you now own `public/media/**` (AGENTS.md §5). 2–3 clips, < 5 MB each,
   transcoded from PSI-25 (CC0); suggested path `public/media/psi-25/<testId>-<kind>.mp4` →
   `fallbackHref: "/media/psi-25/<testId>-<kind>.mp4"`. Clip must start at source t = 0
   (it may end early) so `seekVideo.timeS` maps 1:1. Need an offset? Open a `contract` issue.
5. **`miscVideos`**: every `.mp4` in `groups` that is not in any `Experiment.videos` — crew ops,
   backups, and footage of `videoTestIdsWithoutTableRow`. Exhaustive and disjoint; once you
   compute it, always emit it (`[]` if empty). Their metadata goes on the manifest entry only.
6. When the pipeline first emits any of these, bump `schemaVersion` to `0.2.0` in both files.

## What I need from you (concrete, testable)
- #3: M5 bound per rule 1; `pnpm test` green (validateDataset).
- #13: metadata + `miscVideos` + clips per rules 2–5; add a published-pair assertion to your
  loader tests: `validateMediaLinks(dataset, manifest)` returns `[]`.
- Loaders in `src/lib/data` should run `validateMediaLinks` after both files validate.

## Files/contracts involved
`src/types/{experiment,schemas,validate}.ts` (mine) · `pipeline/build_psi25.py`,
`public/data/psi-25/*.json`, `public/media/**`, `src/lib/data/**` (yours).

## Deadline / blocking what
#13 feeds the flame viewer (#12, Antigravity) fallback path for the demo — Phase 2 (by T+17).
