# 06 — Native Markdown Storage Delegation in NeuronMemory

**What to build:** `NeuronMemory` automatically initializes `DualStorageRouter` with `neuron.yaml` settings upon startup, routing all `.query()` and `.transact()` calls across all CLI commands (`learn`, `memory`, `history`, `exec`, `ui`) directly to `.neuron/*.md` files when `storage.mode: md-only` or `dual` is set, without requiring `neuron sync`.

**Blocked by:** #05 — CLI Config and Sync Commands

**Status:** completed

- [x] `NeuronMemory` loads `neuron.yaml` config and instantiates `DualStorageRouter` internally.
- [x] `memory.query()` and `memory.transact()` delegate transparently to `DualStorageRouter`.
- [x] All CLI commands (`neuron learn`, `neuron memory`, `neuron history`, `neuron exec`) read and write to Markdown files natively when configured.
