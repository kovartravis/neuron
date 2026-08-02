Type: grilling
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

## Input from 06

Two findings from [06 — Write-Side Enrichment](06-write-side-enrichment.md) that
change how this ticket should be built, both measured on the shipped model:

1. **Prompt few-shot, or get nothing.** An instruction-style prompt asking for a
   labelled field (`importance: <digit>`) was answered by *continuing the note*:
   12 of 12 inferences unparseable. The identical task with three worked examples
   answered with a bare token every time. At 0.5B this is not a refinement.
2. **One field per generation.** A multi-field answer is not reliably parseable.
   Two calls against an already-resident model cost ~183ms each — cheap next to
   the ~3.2s load — so split the fields rather than the prompt.

Available to reuse: `withTimeout` (`src/components/timeout.ts`), the shared
process-level model singleton (`src/components/generator.ts`), the
`recordDegradation` counters surfaced by `neuron status`, and the
`llm.enrichment` config namespace's sibling slot under `llm`.

## Measurement taken 2026-08-01 — grill the premise before the design

A session claimed this ticket, measured the live store, and pivoted to another
bug before grilling. **The measurement stands and it challenges the premise.**
Whoever picks this up should start from "does dedupe have a subject at all?"
rather than from the six scope items.

Pairwise cosine over all 239 entries of this project's store:

| cosine | pairs | cross-category (scope item 4 forbids merging these) |
|--------|-------|------------------------------------------------|
| ≥0.99  | **1** | 0 |
| ≥0.95  | 3     | 2 |
| ≥0.90  | 13    | 8 |
| ≥0.85  | 57    | 32 |

**Same-category pairs at ≥0.95: exactly one**, and it is a byte-identical
repeat — findable by content hash, no model required. Lower the threshold to
catch anything more and the band immediately fills with pairs that are
*semantically opposite*:

- `Explained NEURON_MOCK_EMBEDDER check in exec.ts` vs
  `Removed NEURON_MOCK_EMBEDDER check from exec.ts` — cos **0.9210**
- `Bumped version to 1.1.1` vs `Bumped version to 1.1.3` — cos **0.9436**,
  different releases

Adjudicating those demands reliable **negation detection**, the weakest
capability of both a 0.5B model and the embedder shortlisting for it. That is
the same shape as ticket `24`: content-only judgement by this model, gating an
irreversible operation. `24` disqualified both its arms on exactly that.

Two further findings that bear on scope:

- **Most apparent "duplication" is a different bug.** 15 exact-content duplicate
  groups exist (largest: 21 entries), but most are collided single-token rows
  produced by the argv-truncation defect fixed in `v2.1.2`, not genuine repeats.
  Re-measure duplicate density on a store written *after* that fix before
  trusting any number here.
- **ADR 0010 §7 points this ticket's A/B at the wrong instrument.** It nominates
  Pillar 7's "existing `supersededViolations`", but that metric is a corpus
  fixture measuring whether an older entry outranks its newer replacement in
  *ranking*. It does not observe a `superseded_by` column and would not move if
  dedupe were switched on or off. This ticket needs a new instrument.

Retrieval was independently measured at recall@10 **98.3%** (ticket `22`), so
the "near-duplicates crowd retrieval" premise has no supporting evidence in this
store. Plausible outcomes: dedupe narrows to hash-exact with no model at all, or
it is ruled out of 2.2.0 the way automatic pruning was. Its **supersession half
may still be worth keeping** — the ticket-`25` near-miss showed the map needs a
way for a decision to *supersede* a stale high-confidence entry rather than
merely compete with it.
