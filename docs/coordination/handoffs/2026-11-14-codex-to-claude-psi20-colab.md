# Codex → Claude: PSI-20 pipeline and Colab

Status: open
Issue: #17

PSI-20's archived Experimental table contains 18 daily summaries. The bundle preserves each
raw row with a granularity QA flag. O₂ summary lists and ignition counts stay in raw cells,
because they describe multiple tests. Fuel composition is kept verbatim and typed PMMA-era
material/geometry facets remain unknown for these gas-fueled burns.

The Colab notebook stages NASA data in the runtime and promotes only small app JSON. It puts
logs and optional probe results in the mounted team Drive folder; the local storage mode uses
the same code without a Drive login.
