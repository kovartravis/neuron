Type: grilling
Status: resolved
Blocked by: (none)
Band: context cost

# 16 — Memory Supersession: Stop a Reversed Entry From Outcompeting Its Reversal

## Question

When a later decision reverses an earlier one, how does the store stop the
earlier entry from surfacing (or from being trusted over the reversal) once
the reversal exists — without deleting anything?

## Context

Not a new problem — it was already sitting in this map's own fog:

> "Capturing a maintainer decision, not just an agent action... hooks own the
> read side, and this is a write-side capture gap. What is unformed is whose
> job the write is, and how a reversal *supersedes* a stale high-confidence
> entry rather than merely competing with it."

[Ticket 10](10-counterfactual-token-ab.md) graduates it from theoretical to
measured: in a real 24-session A/B, the memory arm's failure rate was
*higher* than the no-memory control's (33% vs 17%), and both misses were the
same shape — a `.neuron/decisions.md` entry recording an earlier ticket's
resolution outcompeted the *separate, later* entry that reverses it. Neither
entry is wrong on its own; nothing marks the first one as superseded. See
`.scratch/neuron-2.3.0/audits/10-counterfactual-token-ab/findings.md` for
the two concrete cases.

**This is explicitly not automatic pruning.** Ticket 24
([neuron-2.2.0](../../neuron-2.2.0/issues/24-pruning-ab-test.md), see also this
map's `pruning-defaults-intentional`/`pruning-ab-verdict` memory entries)
already tried model-judged deletion and killed it: the shipped 0.5B model
false-deleted ground-truth-unrecoverable entries, including ADRs it could
not distinguish from routine notes by content alone. Supersession must not
re-open that path — it marks an entry as superseded (stops it surfacing, or
demotes it), it does not delete it, and — per the false-delete lesson —
whatever decides *that* entry A supersedes entry B should not be asked to
make the same content-only judgement call that already failed once.

**This map's own ticket 08 out-of-scope note anticipated this ticket by
name:** "The supersession half may return as a NEW ticket on its own
merits, because the ticket 25 near-miss showed the system needs a way for a
new decision to supersede a stale high-confidence entry rather than merely
outrank it." This is that ticket.

**Blocks [04](04-cut-and-publish.md) (cut-and-publish)** — maintainer
decision 2026-08-07: 2.3.0 does not cut until superseded entries stop
outcompeting their corrections, rather than shipping the benchmark suite's
unfavorable finding as a known, unfixed limitation.

## Scope

Open design questions for the grilling session, not pre-answered here:

1. **Trigger.** How does a session mark "this entry supersedes that one"?
   An explicit command (`neuron memory supersede <old-id> --with <new-id>`)
   the agent calls when it recognizes a reversal? A new write-side protocol
   step (CLAUDE.md steps 2-4 currently record what the agent *did*; this
   would be the first step recording what the agent *learned reverses*
   something)? Automatic detection is very likely off the table for the
   same reason ticket 08's dedupe was ruled out on neuron-2.2.0 — negation
   detection is "the weakest capability of both a 0.5B model and the
   embedder that would shortlist for it" — but the grilling session should
   confirm rather than assume.
2. **Effect on retrieval.** Hard-exclude a superseded entry from results
   entirely, or demote it (and if demoted, by how much, and does that
   reliably clear a ~0.97 same-topic cosine gap the way ticket 27's
   relevance gate had to)? A hard exclude is simpler and matches "stops
   surfacing" in the Question above, but forecloses ever wanting the
   history (e.g. "why did we used to think X").
3. **Schema.** Does this need a `superseded_by` / `superseded_at` column
   (additive migration, same shape as ticket 25's collision-fix scope), or
   can it reuse something ticket 08's shelved supersession design already
   sketched? ADR 0010 §6 says that design "still governs... if dedupe ever
   returns" — read it before assuming a fresh design is needed.
4. **Direction and multiplicity.** Can an entry supersede more than one
   prior entry? Can a superseded entry later be un-superseded (a correction
   to the correction)? Ticket 10's two cases were both simple 1:1 reversals
   — don't over-build for cases not yet observed, but the grilling session
   should at least rule on whether N:1 is in scope now or fogged off.
5. **Existing store migration.** `.neuron/decisions.md` already contains at
   least the two known-reversed pairs ticket 10 found. Does landing this
   feature include manually marking those, or is that a separate task?
6. **Interaction with prune's importance field.** Ticket 24/26 already
   settled that importance inference is gone entirely and prune stays
   manual-only. Confirm supersession doesn't quietly reopen either of those
   — it is a different mechanism (visibility, not deletion or importance
   scoring) and should not need to touch `importance` at all.

## Verification

Whatever ships must be checked against ticket 10's own harness, not a new
one: re-run `benchmarks/token-ab/run.mjs` (or a task subset covering the two
known-reversed cases) after implementation and confirm the memory arm's
failure rate on `prune-default-collision` and `pruning-ab-verdict` drops to
match or beat the control arm's. A design that can't be measured this way
hasn't actually closed ticket 10's finding, just theorized about it.

## Deliverables

- [ ] Grilling session resolving Scope items 1-6
- [ ] ADR recording the decision (ADR 0010 §6 amended, or a successor)
- [ ] Implementation, with the existing two known-reversed pairs marked
- [ ] Re-run of ticket 10's harness confirming the failure-rate regression
      is fixed, feeding an updated (or reconfirmed) finding into `03`/`04`

## Answer

Grilled with the maintainer 2026-08-08, resolving all six Scope items. Full
rationale in [ADR 0015 — Memory Supersession](../../../docs/adr/0015-memory-supersession.md).

1. **Trigger**: `neuron memory add` hard-blocks the write when the embedder
   (already resident, no model call) finds high similarity to an existing
   entry. The embedder only shortlists candidates — it never decides the
   relationship. The agent must re-invoke with an explicit resolution
   (`--supersedes <old-id>`, or an override confirming it's not a reversal)
   before the write completes. No standing `CLAUDE.md` protocol step — that
   would tax every session, working against this map's own context-cost
   band.
2. **Retrieval effect**: superseded entries are hard-excluded from default
   `neuron memory query` / `neuron exec` results, matching ADR 0010 §6's
   existing precedent. Rows are never deleted — reachable by direct id
   lookup or an explicit include-superseded flag. Demotion-by-score was
   rejected: ticket 27 already found the same-topic band sits at ~0.97
   cosine with almost no intermediate range, so a demotion has no
   calibrated basis.
3. **Schema**: dedicated `superseded_by` (id) / `superseded_at` (timestamp)
   columns, additive migration — not the generic `fields` mechanism (ticket
   43/ADR 0013), which is for config-declared per-category attributes, not
   a relationship the read path must filter on unconditionally.
4. **Direction/multiplicity**: one-way only, no undo command. A wrong mark
   is corrected by writing a new entry that supersedes the wrongly-
   superseding one — same mechanism throughout, keeps the record uniform.
   Many-old→one-new works implicitly (schema puts `superseded_by` on the
   old row); one-old→many-new stays unbuilt, unobserved in ticket 10's two
   real cases.
5. **Existing store migration**: the two known-reversed pairs
   (`prune-default-collision`, `pruning-ab-verdict`) are hand-fixed
   directly as a one-off data correction. No general-purpose link command
   for pre-existing entries ships — the add-time flag is the only
   supported surface going forward.
6. **Importance/prune interaction**: none, confirmed. Supersession only
   touches `superseded_by`/`superseded_at`; it does not read or write
   `importance` and does not trigger or resemble automatic pruning (ticket
   24's false-delete disqualification and the ADR 0010 importance-inference
   removal both stand untouched).

**This ticket resolves the design only.** Implementation (schema migration,
the add-time block, the retrieval filter, hand-fixing the two known pairs)
graduates to
[17 — Implement Memory Supersession](17-implement-memory-supersession.md),
per this map's "carries execution, one ticket per session" posture. The
ticket-10-harness re-run that actually confirms the fix is a further split,
[18 — Re-run Counterfactual A/B After Supersession](18-rerun-counterfactual-ab-post-supersession.md)
(blocked by `17`), so the build ticket isn't the one grading its own
outcome.

## Comments

(none yet)
