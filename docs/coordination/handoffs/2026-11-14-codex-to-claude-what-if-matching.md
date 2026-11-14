# Codex → Claude: What-if retrieval API

Status: open
Issue: #8

Register the AI matching tool using the server-side
`findClosestExperiments(params: LabParams): LabResult` from `@/lib/science/matching`.
The result contains only measured run IDs and input deltas. `insideEnvelope` uses
same-material and same-geometry complete measurements and a normalized nearest-neighbor
threshold of 0.25. A false flag calls for the measured-envelope warning.
