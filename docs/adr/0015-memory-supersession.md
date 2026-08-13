# ADR 0015 — Memory Supersession

- **Status:** Accepted (2026-08-08)
- **Relates to:** [ADR 0010 §6](0010-llm-job-guardrails.md) — the shelved
  dedupe design this ticket's "supersession half" was carved out of; §6's
  "detect and select, never write" / "superseded, not deleted" posture is
  inherited, not re-litigated
- **Ticket:** 16 — Memory Supersession (ticket `e329f037-389f-46d6-8254-6884eb0bfc96`)
- **Blocks:** 04 — Cut and Publish (ticket `72773373-0f02-4a0e-8ba1-e0bf3099c4df`)

## Context

Ticket 10 — Counterfactual Token A/B: Does Neuron Pay for Itself? (ticket `b6634c8f-b66d-44c8-a495-e06b4483f4e4`)'s
counterfactual A/B measured the memory arm failing *more* often than a
no-memory control (33% vs 17%), both misses the same shape: a
`.neuron/decisions.md` entry recording an earlier decision outcompeted a
*separate, later* entry that reverses it. Neither entry is individually
wrong. Nothing in the store marks the first as superseded.

This is not new — it was fog on the `neuron-2.3.0` map ("capturing a
maintainer decision, not just an agent action") that 2.2.0's shelved dedupe
ticket (08 — LLM-Assisted Consolidation & Dedupe, ticket `42f34041-4c77-418c-9ee3-2746eecbb490`) named by
its outcome before either fog item was sharp: *"the supersession half may
return as a NEW ticket on its own merits."* Ticket 10 is that return —
measured, not theoretical.

**Explicitly not a reopening of automatic pruning.** Ticket 24
(`neuron-2.2.0`) already disqualified both LLM-judged deletion arms on
false-deletes of ground-truth-unrecoverable entries, including ADRs the
model could not distinguish from routine notes by content alone. Supersession
marks visibility; it does not delete, and it does not ask a model to make
the same content-only judgement call that failed there.

## Decision

### 1. Trigger: a hard block on `neuron memory add`, not a standing protocol step

Automatic (model-inferred) supersession detection is off the table for the
same reason ticket 24 and 2.2.0's dedupe ticket ruled it out elsewhere:
negation detection — telling "this reverses that" from "this is the same
topic" — is the weakest capability of both the 0.5B model and the embedder
that would shortlist for it. A standing new `CLAUDE.md` protocol step was
also rejected: it would tax every session regardless of whether anything
was ever superseded, working against this map's own context-cost band
(tickets `07`–`09`).

Instead, `neuron memory add` computes embedding similarity against existing
entries as part of its existing write path (the embedder is already
resident for enrichment; no model call). Above a similarity threshold, the
write **hard-blocks**: it returns the candidate id and content and requires
the agent to re-invoke with an explicit resolution — `--supersedes <old-id>`
(confirms a reversal) or an override confirming it is not one — before
anything lands. The embedder only shortlists candidates; it never decides
the relationship. This is the same "vector-shortlist, never auto-adjudicate"
shape ADR 0010 §6 already used for dedupe, applied to a write-time gate
instead of a batch consolidation pass.

### 2. Retrieval: hard-exclude by default, never delete

A superseded entry is excluded from default `neuron memory query` /
`neuron exec` results, matching ADR 0010 §6's existing precedent for
dedupe's non-selected duplicates ("excluded from recall by default"). The
alternative — demoting by a score penalty — was rejected: ticket 27 already
found the same-topic similarity band sits at ~0.97 cosine with almost no
intermediate range, so a demotion strong enough to reliably clear that gap
has no calibrated basis and risks either not suppressing the stale entry or
suppressing genuinely-relevant near-duplicates.

The row is never deleted. It remains reachable by direct id lookup or an
explicit include-superseded flag on query — the same reversibility
guarantee §6 already committed to ("a flag flip to undo rather than
permanent loss of wording the survivor may lack"), applied here to
*visibility* rather than to a merge decision.

### 3. Schema: dedicated columns, not the generic `fields` mechanism

`superseded_by` (entry id) and `superseded_at` (timestamp) ship as new,
additive columns — the schema migration ADR 0010 §6 already named as a
consequence before dedupe was shelved. The generic per-category `fields`
mechanism (ticket 43 / ADR 0013) was considered and rejected: it is
designed for config-declared, per-category user attributes, not a
relationship the read path must filter on unconditionally, for every
category, regardless of config. Hard-exclude (Decision 2) needs one
universal filter; a dedicated column gives it one.

### 4. Direction and multiplicity: one-way, no undo

Supersession is strictly forward. There is no `unsupersede` / undo command.
Correcting a wrong mark means writing a *new* entry that supersedes the
entry that wrongly superseded something — the same mechanism used
throughout, never a special-cased reversal path. This trades off ADR 0010
§6's "flag flip to undo" framing (written for dedupe's merge-survivor
choice) for a simpler, single-direction model here: every correction is a
new fact recorded forward, keeping the record's shape uniform rather than
introducing a second kind of edit.

Many old entries pointing to the same successor works without extra design
— `superseded_by` lives on the superseded row, so nothing stops multiple
rows naming the same new id. One entry having *multiple* distinct
successors is not built: unobserved in ticket 10's two real cases, and
building for it now would be exactly the over-building the ticket warned
against.

### 5. Existing store migration: manual, no new primitive

The two known-reversed pairs ticket 10 found in `.neuron/decisions.md`
(`prune-default-collision` and `pruning-ab-verdict`) pre-date this feature
and involve two already-existing entries, so they cannot go through the
add-time flow in Decision 1 (which requires writing new content). Rather
than build a general-purpose link command for pre-existing entries, they
are hand-fixed directly as a one-off data correction. No `neuron memory
supersede <old-id> --with <new-id>` command ships; the add-time flag is the
only supported surface.

### 6. No interaction with `importance` or pruning

Supersession only ever reads or writes `superseded_by` / `superseded_at`.
It does not touch `importance`, does not infer it, and does not trigger or
resemble automatic pruning — both of which are settled, closed questions
(ticket 24's false-delete disqualification; the 2026-08-02 ADR 0010
amendment removing importance inference entirely). Supersession changes
*visibility*, not deletion or scoring, and the two mechanisms remain fully
orthogonal.

## Consequences

1. **`neuron memory add` gains a similarity check on every write.** This is
   a new cost on the write path (embedder only, no model), distinct from
   and additive to write-side enrichment's existing embedder use.
2. **A schema migration ships**: `superseded_by`, `superseded_at`, additive,
   non-breaking for existing rows (both default null).
3. **The two known-reversed pairs are corrected by hand**, not by a
   reusable migration tool — acceptable because there are exactly two and
   no repeat of this backfill is anticipated.
4. **Correcting a wrong supersession call costs a new entry**, not an edit.
   This keeps the record append-only and uniform but means an agent that
   marks the wrong pair leaves a stale forward-link until a corrective entry
   is written.
5. **Verification is ticket 10's own harness.** Per ticket 16's Verification
   section, this ships only once a re-run of
   `benchmarks/token-ab/run.mjs` (or the `prune-default-collision` /
   `pruning-ab-verdict` task subset) shows the memory arm's failure rate on
   those two tasks matches or beats the control arm's — a design that can't
   be checked this way hasn't actually closed ticket 10's finding.

## Amendments

(none yet)
