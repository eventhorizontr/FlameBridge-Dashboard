# Multi-Agent Coordination Protocol

Three AI engineers + one human share this repo. They cannot talk to each other directly, so
**the repository and GitHub are the message bus.** Everything below exists to make that bus
reliable: one source of truth, no overlapping edits, explicit handoffs, a single integrator.

## 1. Team

| Agent | Role | Strength used here | Runs where |
|---|---|---|---|
| **Human owner** | Product owner, final say, relays between tools, demo | judgement, accounts/keys | — |
| **Claude Code** | Tech lead · architect · integrator · AI-agent system | long-context reasoning, review, planning | local (VS Code) |
| **Codex** | Data & science engineer · tests | disciplined backend/Python, parallel cloud tasks | Codex cloud or CLI |
| **Antigravity** | UI/UX & visualization engineer | design-heavy frontend + **browser visual QA** | Antigravity IDE |

Ownership by path: [AGENTS.md §5](../../AGENTS.md#5-ownership-map-who-may-edit-what).

## 2. Channels (in order of authority)

1. **GitHub Issues** — what to do. Each has: goal, acceptance criteria, owned paths, dependencies
   (`Depends on #n`), label `agent:*`, priority, milestone.
2. **Pull Requests** — what was done. Template enforces checklist; Claude reviews & merges.
3. **`docs/coordination/status/<agent>.md`** — each agent's live state (Now / Done / Next /
   Blockers). Only that agent edits it. Read all three at session start.
4. **`docs/coordination/handoffs/`** — asynchronous messages between agents. Append-only files:
   `YYYY-MM-DD-<from>-to-<to>-<slug>.md` with `Status: open|done`. The recipient flips status.
5. **`docs/coordination/BOARD.md`** — Claude's human-readable sprint summary (mirrors GitHub).
6. **`docs/DECISIONS.md`** — architecture decisions. Anything contested gets an entry.

## 3. Lifecycle of a task

```
Claude: issue (criteria, owner, deps) ──► Agent: claim (comment) + branch
   ▲                                          │
   │                                          ▼
Claude: review ◄── PR (template, CI green) ◄── Agent: implement inside owned paths
   │
   ├─ approve → squash-merge → delete branch → next issue unblocked
   └─ request changes → same agent fixes on same branch
```

- **Branch names**: `<agent>/<issue#>-<slug>` e.g. `codex/12-normalize-airflow`.
- **Commits**: Conventional Commits + trailer `Agent: <name>`.
- **Merge**: squash only, by Claude (or the human). Rebase your branch on `main` before asking
  for review (`git fetch && git rebase origin/main`).

## 4. Conflict-avoidance rules

| Risk | Rule |
|---|---|
| Two agents edit the same file | Path ownership (AGENTS.md §5). Out-of-lane need ⇒ `needs:<owner>` issue. |
| Contract drift (pipeline JSON ≠ TS types ≠ UI) | `src/types/**` + `docs/DATA.md` change only in a `contract` PR by Claude; pipeline must validate output against the contract in tests. |
| Lockfile conflicts | Only one open `deps` PR at a time; if you need a package, ask in your issue first. |
| UI not drivable by AI | All UI state changes go through registered store actions (`src/lib/store`). |
| Stale context | Session start ritual (below) is mandatory. |
| Silent scope creep | New ideas ⇒ new issue, not extra commits. |

## 5. Session rituals

**Start** (every agent, every session):
```bash
git checkout main && git pull --ff-only
cat docs/coordination/status/*.md
ls docs/coordination/handoffs/            # read any "-to-<me>-" with Status: open
gh issue list --label agent:<me> --state open
```
**End**: push branch, update own status file, open/refresh PR, write handoff if someone else
must act, comment progress on the issue.

## 6. Handoff note template

```markdown
# <from> → <to>: <topic>
Status: open
Issue/PR: #<n>
## Context
## What I need from you (concrete, testable)
## Files/contracts involved
## Deadline / blocking what
```

## 7. The human's relay loop (how to run the other agents)

Claude cannot start Codex or Antigravity itself. The owner runs them with the kickoff prompts in
[`prompts/`](prompts/). Typical cycle (~1–2 h):

1. Ask Claude: *"plan next sprint"* → Claude creates/updates issues and BOARD.md.
2. Paste `prompts/codex-kickoff.md` into Codex, `prompts/antigravity-kickoff.md` into Antigravity.
   They each claim their next issue and open PRs.
3. Ask Claude: *"review open PRs"* → Claude reviews, requests fixes or merges.
4. Repeat. Agents re-read status/handoffs each time, so no context is lost between tools.

## 8. Escalation

- Ambiguous requirement → comment on the issue, label `question`, continue with another issue.
- Scientific doubt (units, interpretation) → do **not** guess; flag in QA and ask in the issue.
- Blocked > 1 cycle → label `blocked`, write a handoff to Claude.
