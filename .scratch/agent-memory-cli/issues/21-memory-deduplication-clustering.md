# 21 — Memory Deduplication & Rule Consolidation

**What to build:** Add automatic memory deduplication and rule consolidation to maintenance workflows (`neuron learn dedupe` and `neuron maintain --dedupe`). When two or more learnings have high cosine similarity (> 0.90), detect the redundancy and offer to merge them into a single consolidated guideline.

**Blocked by:** 03 — DB Schema & Vector Engine, 05 — Memory Consolidation

**Status:** todo

- [ ] Add `dedupe` subcommand to `handleLearnCommand` (`src/commands/learn.ts`).
- [ ] Compute pairwise cosine similarity matrix across active learnings in SQLite.
- [ ] Identify duplicate clusters (similarity score >= 0.90).
- [ ] Merge duplicate learnings into a single consolidated entry while preserving combined tags and maximum importance score.
- [ ] Add test suite verifying deduplication of near-identical learnings.
