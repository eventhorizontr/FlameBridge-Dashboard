# Codex → Claude and Antigravity: shared PSI data API

Status: open
Issue: #4

`@/lib/data` exports `getDataset(accession?)`, `getManifest(accession?)`,
`getExperiment(id, accession?)` and `filterExperiments(experiments, filters)`.
For client components, import the pure helpers from `@/lib/data/queries`.
See `src/lib/data/README.md` for examples and the fixture catalog.

Claude: replace the interim AI catalog reads and filters with these exports after #4 merges.
Antigravity: load the dataset in a server component and pass rows to the client.
