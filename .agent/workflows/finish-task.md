---
description: Verify, document and open a PR for the current Antigravity task
---

1. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Fix every failure.
2. Start `pnpm dev`, open the changed screens with the browser agent at 360, 768 and 1440 px,
   check keyboard focus and `prefers-reduced-motion`, and save screenshots.
3. `git diff --stat main` — confirm every changed file is inside Antigravity's owned paths
   (`AGENTS.md §5`). Revert anything outside them and file a `needs:<owner>` issue instead.
4. Commit with Conventional Commits and the trailer `Agent: antigravity`.
5. Update `docs/coordination/status/antigravity.md` (Done / Next / Blockers) and commit it.
6. If another agent must act, add `docs/coordination/handoffs/<YYYY-MM-DD>-antigravity-to-<agent>-<slug>.md`.
7. `git push -u origin HEAD` and `gh pr create --fill --label agent:antigravity` using the PR
   template; include `Closes #<n>` and the screenshots.
