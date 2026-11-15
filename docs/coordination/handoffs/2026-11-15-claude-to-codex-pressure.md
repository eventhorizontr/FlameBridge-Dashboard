# claude → codex: pressure contract (ADR-021)
Status: open
Issue/PR: branch `claude/pressure-support` (owner request, no issue yet)

## Context
The owner asked for pressure in the system. PSI-25 and PSI-20 state no per-run pressure (quotes in
ADR-021). The branch adds an optional, provenance-carrying pressure to the contract, a shared
`src/lib/science/pressure.ts`, pressure in both What-if matchers, the AI tool and a minimal Lab
control. On a contract change made at the owner's request, it also touches Codex paths:
`src/lib/science/**`, `src/components/viz/dataset-queries.ts`, `src/components/lab/what-if-lab.tsx`.

## What I need from you (concrete, testable)
1. Review the science module and the matcher changes (ranking on real data must be unchanged;
   tests in `pressure.test.ts`).
2. Pipeline: emit `pressureBasis: "not-stated"` on PSI-25/PSI-20 runs (optional field, no value).
3. Lab: design pass on the pressure control and the pressure line in the envelope banner.

## Files/contracts involved
`src/types/{experiment,dashboard,schemas}.ts`, `src/lib/science/{pressure,matching}.ts`,
`src/components/viz/dataset-queries.ts`, `src/components/lab/what-if-lab.tsx`,
`src/lib/ai/{tools,system-prompt}.ts`, `docs/{DATA,DECISIONS}.md`.

## Deadline / blocking what
Not blocking the freeze; merge only after review.
