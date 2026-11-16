# FETE architecture vs. Dashboardv1: what to add, adapt, defer or drop

_2026-11-15 · owner request · base `main@a0baa61` · status: proposal (no code in this branch)_

The team's earlier architecture, **FETE: Fire Evidence Transfer Engine** (14-section PDF:
scenario input → NASA evidence collection → knowledge graph → conditional analysis and transfer
engine → RAG + LLM synthesis → UI), is compared here with the dashboard as it stands. Each item is
judged on three axes:

- **Repos.** What other Flame in Freefall 2026 entries built, and how it held up. The repos are
  MicroFire-Atlas, FCDS-College/Nasa and Pyraxis, plus our own FlameBridge backend.
- **Literature.** Whether published NASA work supports the item.
- **Feasibility.** Whether our data (PSI-25 BASS-II, PSI-20 ACME BRE) and our timeline (code
  freeze 2026-11-15 19:00 +03:00) can carry it honestly.

Rule 1 of `AGENTS.md` ("never fabricate science") is the tie-breaker everywhere.

## Verdict key

| Verdict | Meaning |
|---|---|
| **HAVE** | Already in Dashboardv1; keep. |
| **ADD** | Worth building; the data supports it; small enough for the next sprint. |
| **ADAPT** | Keep the intent, change the form (usually to stay inside rule 1 or the static-JSON stack). |
| **DEFER** | Valuable, but needs data, evaluation or time we do not have. |
| **DROP** | Conflicts with rule 1, or nothing in our data could ever fill it. |

## 1. Scenario input (FETE §1)

| FETE item | Dashboardv1 today | Verdict | Why |
|---|---|---|---|
| Material / fuel | `LabParams.material`, `geometry`, `characteristicSizeMm` | **HAVE** | Matches the PSI-25 fuels. |
| O₂, HVAC airflow | `o2Pct`, `airflowCmS` | **HAVE** | Both recorded per run in PSI-25. |
| Cabin pressure | absent from `Conditions` and `LabParams` | **ADD** (branch `claude/pressure-support`) | Exploration atmospheres differ mainly in pressure: 56.5 kPa / 34 % O₂ in NASA/TP-2010-216134. Every competitor that handles Moon or Mars scenarios models pressure. The PSI-25 and PSI-20 tables **do not record pressure**, so the honest feature is a pressure input, a coverage verdict and derived ppO₂ only where both values exist, never an assumed value (see §8). |
| Gravity 0 / 0.16 / 0.38 / 1 g | absent | **ADAPT** | Accept the input, but report coverage, not an answer. All PSI-25 runs are microgravity, so a lunar query must return "no data in this gravity regime". MicroFire handles this with explicit gaps, FCDS with a gravity refusal, FlameBridge with regime-separated candidates. |
| Mission presets (ISS / Moon / Mars) | absent | **ADD** | Presets set O₂ + pressure + gravity together; atmospheres from NASA/TP-2010-216134. Label them "NASA-studied configurations", not "the Moon atmosphere", as MicroFire does. |
| Fire scenario (cable, battery, fabric, equipment) | absent | **DROP** for now | No wire-insulation or Li-ion data in PSI-20/25. Show it as an *unstudied material* gap (MicroFire lists untested materials so they are never silently matched to PMMA). |

## 2. NASA evidence collection (FETE §2)

| FETE item | Today | Verdict | Why |
|---|---|---|---|
| NASA PSI (CSV/JSON/XLSX) | `pipeline/psi_client.py`, PSI-25 (129 runs), PSI-20 manifest | **HAVE** | Strongest part of the system: verbatim raw cells, nulls + QA flags, Zod-validated contracts. |
| NASA NTRS reports | absent | **ADAPT** | Do not bulk-harvest. MicroFire's 62 hand-checked, page-cited quotes did more for answer quality than Pyraxis's 4,590 auto-chunked passages, because every quote carries a PDF page. Start with a curated `findings.json` (quote, source, page, topics), then optional NTRS metadata through the STI OpenAPI. |
| NASA Open Data Portal | absent | **DROP** | For these investigations PSI *is* the open-data route; a second ingest path adds no new runs. |
| Cleaning / standardisation | in pipeline | **HAVE** | Keep the "raw preserved, parse failure ⇒ null + flag" rule. |

## 3. Scientific evidence graph (FETE §3–4)

| FETE item | Today | Verdict | Why |
|---|---|---|---|
| Experiment → Material / FireSignature / Finding / NTRS doc | flat `Experiment` records | **ADAPT** | Build a typed JSON graph (nodes: run, finding, source, gap; edges: `measured_in`, `reported_in`, `supports`), as in MicroFire's `research-planning-graph.json`. That is enough for 147 runs and fits the static Vercel deploy. |
| `conflicts_with` | absent | **ADAPT** | Only as curated edges with both quotes; never inferred automatically. |
| Neo4j | absent | **DROP** | No query in the product needs a graph database at this size. |

## 4. Conditional analysis and transfer engine (FETE §5)

| FETE item | Today | Verdict | Why |
|---|---|---|---|
| Condition matching (similarity score) | `src/lib/science/matching.ts` (weighted, range-normalised Euclidean, envelope threshold 0.25) | **HAVE** | Keep. Fix the duplicate client matcher in `components/viz/dataset-queries.ts`, which has already drifted: its size span is not restricted to the queried geometry. |
| Transfer Confidence (High / Medium / Low / Unknown) | only `insideEnvelope: boolean` | **ADD** as an *evidence-coverage verdict* | none / partial / covered with reasons, computed per fuel phase and gravity regime. Count neighbours within profile tolerances and require ≥ 2 independent groups for "covered". Port from FlameBridge Katman 4 `envelope.verdict`, which itself fixes the FCDS weakness of counting gas-flame tests as coverage for solids. |
| Evidence Strength (Direct / Indirect / Conflicting) | absent | **ADD** as an evidence ladder | direct / analogous / mechanistic / gap. MicroFire's ladder keeps droplet and gas-flame physics as *mechanism only* for solid-material questions. |
| Uncertainty analysis | QA flags | **ADD** rank stability | Recompute the ranking under ~1,000 perturbations of weights, scales and tolerances; show median rank and top-3 share. MicroFire and FlameBridge both do this, it costs no new data, and it answers "how arbitrary are your weights?". |
| Physics / risk analysis | none (by design) | **ADAPT** | Only documented derivations with formula, units and citation in `src/lib/science/`, e.g. O₂ partial pressure by Dalton's law. No fitted response surfaces on 129 runs. |
| Conditional fire **risk score** (w₁ ignition + … + w₅ uncertainty) | none | **DROP** | No outcome variable in PSI-25 supports it: most "went out" labels record the fan-down procedure, not the material (MicroFire's model card says the same). Every strong competitor refuses to output risk or probability. Shipping one would break rule 1 and invite the judges' first objection. Replace with "evidence status, never risk". |
| Literature Gap Score | absent | **ADAPT** | A per-dimension gap list ("no run reaches 34 % O₂", "no run records pressure", "no partial-g run") instead of one opaque number. |

## 5. AI evidence synthesis (FETE §6)

| FETE item | Today | Verdict | Why |
|---|---|---|---|
| LLM limited to evidence | tool-calling agent, "no tool ⇒ no number" in the prompt | **HAVE** | For structured run data, tools beat free-text RAG: numbers come from typed tool results, not passages. |
| Guardrails (citation, uncertainty, hallucination) | prompt rules; server validation of *actions* only | **ADD** a claim checker | Port MicroFire's post-hoc checker: unknown citation removed; factual claim without citation flagged; every number must appear in a cited result; unit kept; microgravity data not described as lunar or Martian; causal or safety wording only if the source says it; no past-to-future predictions. Also check the summary, which MicroFire leaves unchecked. |
| BM25 + dense embeddings (hybrid) | none for text (DINOv2 is for frames) | **ADD BM25, DEFER dense** | BM25 over curated findings and PSI ReadMe/report passages needs no new dependency (Pyraxis, FlameBridge). Add stop words, light stemming, title weight, ≤ 2 passages per source and duplicate-text removal. Dense embeddings need pgvector or a service plus an evaluation set showing they help; at < 5k passages BM25 is adequate. |
| Graph-aware reranker | absent | **DEFER** | Depends on §3. |
| Three viewpoints (combustion scientist / fire-safety engineer / mission planner) | Expert and Learn modes | **DEFER** | Three answers triple the unchecked surface. If kept, generate three *labelled sections* of one checked answer from the same evidence, not three agents. |
| Offline evaluation | none for answers | **ADD** | A frozen question set (MicroFire-Eval: 100 questions incl. unanswerable and misleading ones) with citation precision, numeric fidelity, unit fidelity, gap admission and a `--rescore` mode that re-checks saved answers without API cost. |

## 6. Research priority engine (FETE §7)

| FETE item | Verdict | Why |
|---|---|---|
| Gap classification (unstudied material, missing gravity / atmosphere / signature, conflict, scale) | **ADD** | Directly computable from the coverage verdict and the material list. |
| Experiment-design generator (sensor configuration, *expected fire signature*, safety boundary) | **ADAPT** | Keep only the *matched-condition next test*: the missing combination of material × O₂ × pressure × flow × gravity. "Expected signature" is a prediction → drop. |
| Priority score (crew impact × gap × relevance × feasibility) | **DEFER** | Inputs are subjective. MicroFire labels its version "transparent coverage heuristics, not NASA priorities". If shown, label it the same way and show its factors. |

## 7. UI and outputs (FETE §6 boxes, §12 demo)

| FETE item | Today | Verdict |
|---|---|---|
| Evidence map | O₂ × flow parameter map, Lab 3D envelope | **HAVE** |
| Experiment comparison table | `/compare` | **HAVE** |
| Transfer-confidence gauge | — | **ADD** with the coverage verdict, shown *before* the ranked list |
| Literature Gap Matrix (material × gravity regime) | — | **ADD**: cells computed from data (tested / analogous / gap), no hand-filled "priority" |
| Research Priority Board | — | **DEFER** (see §6) |
| Fire Safety Decision Brief / jury report (MD/HTML/PDF) | — | **ADAPT** → printable *Evidence Brief* (conditions, closest runs, mismatches, gaps, sources); no risk |
| Conditional risk radar | — | **DROP** (see §4) |

## 8. Stack (FETE §9)

| FETE item | Today | Verdict |
|---|---|---|
| React + TypeScript + Tailwind; charts | Next.js 16, D3 | **HAVE** (D3 instead of Recharts/Plotly is fine) |
| Cytoscape.js evidence graph | — | **DEFER** with §3 |
| Three.js cabin view | R3F Lab 3D and 3D flame (ADR-018) | **HAVE** |
| FastAPI, PostgreSQL + pgvector, Neo4j, Redis, Celery | Next.js API routes + static JSON | **DROP** for this phase: no workload needs them, and the no-login Vercel deploy is a judging criterion |
| pandas / SciPy / scikit-learn | stdlib pipeline + vision stack | **HAVE** where needed |

## Pressure: what the data actually allows

- `data/raw/psi-25/PSI-25_Experimental table_BASS-II.csv` has no pressure column. The BASS-II ReadMe states no pressure value. The Ops procedure mentions pressure only as "adding GN2 to the WV to reduce the O2 partial pressure".
- `data/raw/psi-20/PSI-20_Experimental table_ACME BRE.csv` states: "The chamber pressures were also varied but are not identified in this summary table."

So for every current run, pressure is **not stated**. The pressure branch therefore adds:

1. an optional, provenance-carrying pressure field in the contract;
2. a series-level pressure statement quoting the sources above;
3. a pressure input in the Lab and the AI tool;
4. a pressure-coverage verdict that turns a pressure query into "outside the measured envelope: no run records pressure";
5. ppO₂ derived only when both O₂ and pressure are stated.

It never assumes ISS cabin pressure for a run.

## Suggested order (fits the remaining hours)

1. `claude/pressure-support`: pressure contract + coverage (this request).
2. Mission presets + gravity input → coverage verdict ("no partial-g data").
3. Claim checker on assistant answers + a 30-question frozen eval.
4. Evidence ladder + gap matrix on the Lab page.
5. After the hackathon: curated findings + BM25, typed evidence graph, rank stability, Evidence Brief.

Owners per `AGENTS.md` §5:

| Area | Owner |
|---|---|
| Contracts, `src/lib/ai`, `docs/` | Claude |
| `src/lib/science`, `pipeline`, Lab UI | Codex |

## Sources

### NASA and standards
- NASA Exploration Atmospheres Working Group, *Recommendations for Exploration Spacecraft Internal Atmospheres: The Final Report of the NASA Exploration Atmospheres Working Group*, NASA/TP-2010-216134 (2010).
- NASA-STD-6001B, *Flammability, Offgassing, and Compatibility Requirements and Test Procedures*.
- Urban, D. L., et al., "Flame spread: Effects of microgravity and scale", *Combustion and Flame* 199 (2019) 168–182 (Saffire). Verify the DOI before it is cited in the UI.
- NASA, *Challenges and Research Needs for Micro- and Partial-Gravity Fires*, NTRS 20210022403.
- NASA, *Research Questions and Challenges for Improved Spacecraft Fire Detection*, NTRS 20210022143.
- NASA PSI-25 BASS-II dataset, DOI 10.60555/4qc4-de67 (CC0); PSI-20 ACME BRE, DOI 10.60555/vb93-3y72.

### Retrieval methods
- Robertson, S., Zaragoza, H., "The Probabilistic Relevance Framework: BM25 and Beyond", *Foundations and Trends in Information Retrieval* 3(4) (2009) 333–389.
- Lewis, P., et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", NeurIPS 2020.
- Cover, T., Hart, P., "Nearest neighbor pattern classification", DOI 10.1109/TIT.1967.1053964 (already cited in `matching.ts`).

### Repos compared (public, read 2026-11-14/15)
- `A-K-M-Asifuzzaman/MicroFire-Atlas`: evidence ladder, claim checker, MicroFire-Eval, rank robustness, refusal of risk/probability.
- `FCDS-College/Nasa`: none / partial / covered coverage verdict; log-pressure scale; FLEX applicability refusal.
- `InFynnity8/Pyraxis`: BM25 over PSI documents; no post-hoc citation check; model predictions in the search index (avoid). No licence file: do not copy code.
- FlameBridge `backend/layer4` (ours): phase-aware coverage verdict, ratio pressure comparison, ppO₂, BM25 evidence packet, claim validator.
