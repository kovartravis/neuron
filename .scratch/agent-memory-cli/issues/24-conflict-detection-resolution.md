# 24 — Interactive Rule Conflict Detection & Resolution

**What to build:** Add conflict detection when a new learning is added that contradicts an existing high-importance learning. When semantic similarity is high (> 0.85) but the sentiment/instruction conflicts, warn the user/agent and provide options to override, update, or scope-lock the rule.

**Blocked by:** 10 — High-Importance Scope Lock, 21 — Memory Deduplication & Rule Consolidation

**Status:** todo

- [ ] Analyze candidate learning against existing high-importance learnings during `learn add` / `learn update`.
- [ ] Detect potential rule contradictions or semantic collisions.
- [ ] Return warning and conflict resolution metadata in JSON response.
- [ ] Add unit tests verifying conflict warnings when adding contradicting guidelines.
