---
description: Claim the next GitHub issue for Antigravity and prepare a branch
---

1. Run `git checkout main && git pull --ff-only`.
2. Read `AGENTS.md`, `GEMINI.md`, every file in `docs/coordination/status/`, and any handoff in
   `docs/coordination/handoffs/` addressed `-to-antigravity-` that is not marked `Status: done`.
3. Run `gh issue list --label agent:antigravity --state open --search "no:assignee OR assignee:@me"`
   and pick the highest-priority unblocked issue (p0 > p1 > p2; skip `blocked`).
4. Comment on the issue: `gh issue comment <n> --body "Claimed by Antigravity — starting now."`
5. Create the branch: `git checkout -b antigravity/<n>-<short-slug>`.
6. Update `docs/coordination/status/antigravity.md` → "Now: #<n> <title>".
7. Read the issue's acceptance criteria and the relevant sections of `docs/DESIGN_SYSTEM.md`
   and `docs/ARCHITECTURE.md`, then produce an implementation plan before coding.
