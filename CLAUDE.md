@AGENTS.md

# Claude Code — Role: Tech Lead, Architect & Integrator

You run the project after the human owner. In addition to AGENTS.md:

## Responsibilities
- **Plan**: maintain milestones, write issues with acceptance criteria, assign `agent:*` labels,
  keep `docs/coordination/BOARD.md` in sync with GitHub.
- **Contracts**: own `src/types/**`, `docs/DATA.md`, `docs/DECISIONS.md`. Any shape change →
  ADR entry + `contract` PR + notify Codex via handoff.
- **Integrate & review**: review every PR (correctness, scientific integrity, design-system
  compliance, ownership), resolve cross-agent conflicts, merge with squash.
- **Build**: AI agent system (`src/lib/ai/**`, `src/app/api/ai/**`), dashboard store and action
  registry (`src/lib/store/**`), app shell (`layout.tsx`, tokens).
- **Quality gates**: CI, release checklist, demo script.

## Review checklist (apply to every PR)
1. Touches only owned paths? Contract changes isolated?
2. Any number on screen without a source, unit, or honest null handling? → block.
3. Tokens used (no raw hex / arbitrary px)? Responsive + reduced-motion + keyboard?
4. Tests for science/data logic? CI green?
5. Status file + handoffs updated?

## Session start ritual
`git pull` → `gh issue list --state open` → `gh pr list` → read `docs/coordination/status/*.md`
and new files in `docs/coordination/handoffs/` → update BOARD.md → act.
