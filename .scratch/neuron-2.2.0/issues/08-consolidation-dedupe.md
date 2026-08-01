Type: task
Status: unclaimed
Blocked by: 05
Band: 2.2.0-rc2

# 08 — LLM-Assisted Consolidation & Dedupe

## Question

Can the 0.5B model identify and merge semantically duplicate memories during the
existing consolidation pass, without destroying detail that mattered?

## Context

This attacks store rot — the long-term failure mode of any memory system. As
entries accumulate, near-duplicates crowd retrieval: three learnings about the
same md-storage bug all surface, spending context to say one thing.

Consolidation already exists as a cursor-based pass that handles scope promotion
and demotion over a rolling 30-day query-frequency window. This ticket adds a
semantic merge step to it.

Latency is free here — consolidation is a batch path, so the ~1.5s per inference
that constrains tickets `06` and `07` does not bind.

**What does bind: this job destroys data.** Merging is the only one of the three
new LLM jobs that removes information from the store. A wrong merge is
unrecoverable and silent — the detail is simply gone, and nothing in a later
query reveals that it used to be there.

## Scope

1. Detect near-duplicate candidates. Use the existing BGE vectors for candidate
   selection — a similarity threshold is cheap and precise — and reserve the
   model for adjudicating whether flagged candidates genuinely say the same thing.
2. Merge into a canonical entry preserving the union of tags, the maximum
   importance, the earliest `createdAt`, and every distinct `taskId`.
3. Honour the destructiveness policy from ticket `05`: confirmation, audit trail,
   and/or reversibility as decided there.
4. Never merge across categories. A `learning` and a `history` entry about the
   same incident are different artifacts serving different reads.
5. Respect `is_manual_scope`. A user who explicitly pinned a memory's scope has
   signalled it is not fungible — exclude it from merging.
6. Handle the dual-storage modes: if `.neuron/*.md` files are in play
   (`md-only`, `dual`, `split`), a merge must reconcile both sides or the
   markdown and vector stores diverge.

## Verification

- Pillar 5 (Storage Corruption & Self-Healing) is the natural home.
- Build a fixture store containing known duplicates *and* known
  similar-but-distinct pairs. **Correctly declining to merge is the harder test**
  and matters more than merge recall.
- Verify no entry is lost: pre- and post-consolidation content must reconcile.

## Deliverables

- [ ] Vector-shortlist + model-adjudication dedupe in the consolidation pass
- [ ] Canonical merge preserving tags, importance, timestamps, task IDs
- [ ] `is_manual_scope` and cross-category exclusions enforced
- [ ] Md/vector reconciliation for dual-storage modes
- [ ] Destructiveness safeguards per ticket `05`
- [ ] Pillar 5 fixtures covering both merge and correct non-merge
