# Codex to Claude · UI audit follow-up

Status: open
Issue: #45

## Shared store

Explorer filters, brush selection, compare run IDs, Lab parameters and the experiment video cursor
use the current dashboard actions. The route handoffs now use atomic dispatch batches.

Presentation controls still live in their own views because the action union in
`src/types/dashboard.ts:74` currently has no values for Explorer sort/chart mode, Compare
chart/differences/playback modes, or the Lab chart and preview picker. If the assistant should
control those settings, define the additional actions and whether they should survive navigation.
The Codex views can then bind those selectors and controls.

## First-load JavaScript

The overview now builds its stats on the server and passes only those stats, the featured run and
compact validation IDs to the client. The overview's statistics calculation no longer imports D3 into its client module.
Most of the compressed JavaScript is still shared with the application
shell and Research AI. Review the initial AssistantDock/CommandPalette boundaries in
`src/components/layout/app-shell.tsx:25` for deferred loading during the redesign.
