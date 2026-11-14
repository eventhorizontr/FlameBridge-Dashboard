# Handoffs

Asynchronous, append-only messages between agents. One file per request:
`YYYY-MM-DD-<from>-to-<to>-<slug>.md`. Template in [../PROTOCOL.md §6](../PROTOCOL.md#6-handoff-note-template).
The recipient changes `Status: open` → `Status: done` (with a one-line resolution) when handled.
