# Data — sources, contract, known issues

## Primary: PSI-25 — BASS-II (Burning and Suppression of Solids – II)
- Landing page: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25
- DOI **10.60555/4qc4-de67** · License **CC0 1.0** · ISS Microgravity Science Glovebox,
  small wind tunnel, forced flow up to ~40 cm/s, O₂ lowered below 21 % by N₂ vitiation.
- 695 files (~275 GB): ~296 MP4 (primary, 2nd view, still sequence), Nikon still zips,
  127 PDFs, Experimental table CSV, Test Matrices xlsx, ReadMe (data FAQ) docx, fan calibration.
- **129 test runs, 6 PIs:**

| PI | Tests | Fuel / geometry | Flow configuration (ReadMe) |
|---|---|---|---|
| Bhattacharjee | B1–B21 | thin PMMA films (0.1–0.4 mm) | opposed (thin-fuel spread) |
| Miller | M1–M20 | thick PMMA slabs 1–5 mm, 1- or 2-sided | — |
| Olson | O1–O22 | PMMA rods ¼″, ⅜″, ½″ (mostly clear), upstream ignition | concurrent / stagnation |
| Fernandez-Pello | P1–P25 | PMMA rods (mostly black), downstream ignition | opposed |
| T'ien | T1–T29 | SIBAL fabric (75/25 cotton/fiberglass), one 4 cm PMMA sphere | concurrent |
| Ferkul | F1–F4 | Nomex III, Japan-wax candle | — |

(Bhattacharjee's opposed-flow configuration is inferred from his publications, not the
ReadMe — keep it `null` in data until confirmed.)

## Column semantics (from the ReadMe — authoritative)
- **Date** actual test date; video overlay shows +1 day (on-board leap-year bug).
- **GMT** day-of-year. **Test #** PI initial + matrix number; `a`/`b` = repeated runs on one sample/day (share footage files).
- **Flow restrictor** 0 = highest flow … 2 = lowest flow.
- **Fan display** fan voltage ×10 (max 122 = 12.2 V); sometimes control-box pot settings (max 10).
- **Air display** duct flow speed **cm/s**; ~1 min response — only long holds are steady.
- **Radiometer gain** uncalibrated; relative intensity / dynamics only; overlay data at 5 Hz.
- **O₂** sensor out of calibration; corrected by a daily constant offset from MCA reading.
- **CO₂** CDM sensor. **CO** CSA-CP sensor; `OR` = over range (> 1000 ppm).

## Built files
| File | Content |
|---|---|
| `public/data/psi-25/manifest.json` | every PSI file with id, category, subcategory, size, `href`; optional video metadata on `.mp4` entries; optional `miscVideos` index |
| `public/data/psi-25/experiments.json` | `ExperimentDataset` (see `src/types/experiment.ts`) |
| `data/raw/psi-25/*` | verbatim CSV/xlsx/docx used for the build |
| `public/media/**` | 2–3 transcoded fallback clips (< 5 MB each, owner Codex, ADR-004/014) served as `/media/…` |

## Optional fields (ADR-014, backward compatible)
All are **absent until measured** — never estimated, never `null`, never `0` as a placeholder.

**`Conditions.coFinalLowerBoundPpm?: number`** — exclusive lower bound, set only when the
"Final CO (ppm)" cell literally states one: M5 `>500` → `coFinalPpm: null`,
`coFinalLowerBoundPpm: 500` (true value > 500 ppm). Keep the existing QA flag. `OR` cells stay
`null` + flag with no bound (the > 1000 ppm figure is ReadMe context, not the cell). The schema
rejects a bound next to a non-null `coFinalPpm`. UI renders `> 500 ppm`, never `500`.

**Video metadata** — flat, optional keys on the video ref itself:

| Key | Unit / rule | Meaning |
|---|---|---|
| `durationS` | s, finite > 0 | duration of the **PSI source** file |
| `fps` | frames/s, finite > 0 | source frame rate (e.g. 29.97) |
| `width`, `height` | px, positive integers, **both or neither** | source frame size |
| `fallbackHref` | `/media/<path>.mp4\|webm`, no `..` | same-origin transcode in `public/media/` |

They live in two places, which must agree key-for-key (`validateMediaLinks`):
- each `Experiment.videos[]` entry (`ExperimentVideo`) — what the viewer reads;
- the matching `manifest.groups[*][]` entry (`ManifestFileRef`, same `id`) — allowed **only**
  when `ext === ".mp4"`. Misc videos have no experiment, so their metadata lives here only.

Measure from the source file (container/stream headers, e.g. `ffprobe` on a ranged read);
record the probe method in the pipeline. A fallback clip shares the source time origin (clip
t = source t, it may end early) so `seekVideo.timeS` means the same instant in both; if an
offset is ever needed, open a `contract` issue instead of trimming the start.

**`InvestigationManifest.miscVideos?: string[]`** — PSI file ids of every `.mp4` not attached
to any experiment: crew ops, backups, and footage whose test id has no table row
(`videoTestIdsWithoutTableRow`). When present it is **exhaustive and disjoint**: each `.mp4` in
`groups` is in some `Experiment.videos` (split runs may share one) **or** in `miscVideos`,
never both. Emit `[]` rather than omitting it once the pipeline computes it.

## Known issues (seed `heuristic-v0`) — Codex to resolve against the Test Matrix xlsx
1. **Fan/air columns swapped or merged** in some rows, e.g. O13a air = `49 44 42 … (5 2 0)`:
   numbers outside parentheses are fan ×10, those inside are cm/s. Current parser takes all
   numbers ⇒ wrong set-points for those rows. Must parse per-row with explicit rules + tests.
2. Implausible O₂ final values (B2 1.6, P22a 0.6, P22b 39.1, T28a 0.9, T28b 40.4) → null + flag.
   Likely split-run bookkeeping; check Test Matrix.
3. T9/T18 dated 2018 inside a 2014 campaign (GMT 175) → probably 2014; flag, don't change.
4. M5 CO final `>500` is a lower bound, not over-range; represent as
   `coFinalLowerBoundPpm: 500` with `coFinalPpm: null` (ADR-014).
5. Sample IDs carry suffixes (`m`, `M`, `L`) — meaning undocumented; keep verbatim.
6. "Misc" videos (crew ops, backups) are not linked to tests — expose via
   `manifest.miscVideos` (ADR-014).

## Secondary (scalability proof): PSI-20 — ACME BRE
DOI 10.60555/vb93-3y72 · currently one experimental-table CSV. Registered in
`src/lib/psi/config.ts`; builder not yet written.

## Runtime validation
`src/types/schemas.ts` mirrors every contract type in Zod (strict objects; compile-time drift
checks against the interfaces). `validateDataset()` / `validateManifest()` in
`src/types/validate.ts` add cross-record invariants (count, unique ids, `id = accession:testId`,
percent ranges, `href` ↔ file id, `miscVideos` ids unique / present / `.mp4`).
`validateMediaLinks(dataset, manifest)` adds the cross-file checks (every experiment video is a
manifest file with identical metadata; `miscVideos` exhaustive and disjoint when present).
Loaders must validate before use; `pnpm test` validates the published `public/data/psi-25/*.json`
individually and as a pair.
