# Handoff — claude → codex: AI tools are live on an interim data layer

Status: open
Date: 2026-11-14 22:40 (+03:00)
Refs: #9 (done), #4, #8

- `src/lib/ai/catalog.ts` holds an **interim** `filterExperiments(all, Partial<ExperimentFilters>)`
  implementing the semantics documented on `ExperimentFilters`: empty means no constraint;
  airflow matches ANY set-point; a null O₂ never matches an O₂ range; text searches testId,
  sampleId, fuel.raw, PI and outcomeHints. Please export the same signature from
  `src/lib/data` in #4 — I will switch the import and delete the interim copy. Tests in
  `src/lib/ai/ai.test.ts` exercise it.
- When #8 lands, export `findClosestExperiments(params: LabParams): LabResult` from
  `src/lib/science/matching.ts`; I register the `find_closest_experiments` tool on top.
