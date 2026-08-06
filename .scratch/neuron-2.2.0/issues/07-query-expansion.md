Type: task
Status: out of scope — measured and killed 2026-08-02, do not implement
Blocked by: 05
Band: ~~2.2.0-rc2~~ — removed from the band

# 07 — Salvage Expansion for Weak Retrieval

> **Rewritten 2026-08-01 by ticket `05`.** This was "Query Expansion for Terse
> Queries", which expanded *every* query before hybrid search. That shape was
> rejected: it taxes every recall — and after rc3, every agent turn — to improve
> a retrieval step that is already performing. The trigger, the cost profile and
> the prerequisites are all different now. See
> [ADR 0010](../../../docs/adr/0010-llm-job-guardrails.md).

## Question

When retrieval comes back empty or with nothing close enough, can the 0.5B model
rewrite the query well enough to rescue it — without making the result worse?

## Context

`CLAUDE.md` today contains a manual workaround for this exact problem:

> *If no results return, try a broader keyword (`git`, `tdd`, `db`, etc.).*

That instruction exists because terse queries embed poorly. This ticket automates
it — but only at the moment the instruction would have fired, not before every
query.

Two constraints carried over from the original ticket:

- BGE requires **asymmetric embedding** — queries go through `embedQuery()` with
  the `"Represent this sentence for searching relevant passages: "` prefix, while
  passages use raw `embed()`. Expansion happens **before** that prefixing and
  must not disturb it.
- Expansion cannot be made asynchronous: it rewrites the query, so it must
  complete before retrieval runs. Hence the salvage trigger rather than a
  timeout-and-proceed race.

## Prerequisite: surface `similarity`

**This ticket is blocked on a change in `src/index.ts`.** The returned `score` is
`0.75·normRrf + 0.25·normImp`, and RRF is rank-based — a document ranked #1 in
both the semantic and FTS lists scores `normRrf = 1.0` regardless of how distant
it actually is. **The top hit of a nonsense query still scores ≥ 0.75**, so
`score` cannot detect a weak result set, and the existing `minScore: 0.35`
default is a much weaker filter than it looks.

The raw cosine `similarity` is already computed and used for ranking, then
discarded before results are returned. Surfacing it on the result object is step
one of this ticket.

## Scope

1. Surface raw cosine `similarity` on query results.
2. Retrieve on the raw query first. Fire expansion **only** when the result set
   is empty **or** the best `similarity` falls below a floor.
3. **Calibrate the floor against Pillar 2's corpus.** Do not guess it. Record the
   distribution of best-similarity for known-good and known-bad queries and pick
   the separating value; if they do not separate, say so — that is a finding, and
   it kills the trigger.
4. Bound the expansion call with a timeout (none exists in the codebase yet) and
   fall back to the already-retrieved weak results on expiry.
5. Cache by query hash — a repeated weak query must not pay twice.
6. Decide where expansion applies: semantic leg, keyword leg, or both. Expanded
   text may help BGE while *hurting* FTS5 precision — measure rather than assume.
7. Leave `--categories` filtering and scoring thresholds untouched.

## Verification

- **Pass/fail bar — strict non-regression.** Pillar 2 (Adversarial Semantic
  Recall & Distractor Resistance) runs with salvage enabled and disabled. Ships
  only if recall is **no worse** with it on. Neutral passes; worse blocks.
  Expansion that improves plain recall while weakening distractor resistance is a
  net loss and must be caught here.
- Build a fixed set of deliberately terse queries (`git`, `tdd`, `db`, `wasm`)
  with known-good expected hits, and measure the rescue rate: of the queries that
  trip the floor, what fraction end up with the right answer after expansion?
- Record added latency **on the salvage path only** — the happy path must show
  zero measurable change, and that is itself an assertion worth making.

## Deliverables

- [ ] Raw `similarity` surfaced on query results
- [ ] Salvage trigger: empty results or best-similarity below a calibrated floor
- [ ] Recorded calibration evidence for the floor, or a finding that it does not separate
- [ ] Timeout + fall-back to the weak result set
- [ ] Query-hash cache
- [ ] Decision + evidence on semantic-only vs both legs
- [ ] Pillar 2 A/B showing non-regression; rescue rate on the terse-query set
- [ ] Proof the happy path is unchanged (zero added latency when the floor is not tripped)
- [ ] Remove the "try a broader keyword" workaround from `CLAUDE.md` if it lands

## Comments

- 2026-08-01: Rewritten by ticket `05` from front-line expansion to salvage.
  Original framing asked whether expansion "measurably improves recall enough to
  justify sitting on the interactive path" — the answer taken was that it does
  not, so it no longer sits there.

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

## Answer

**Ruled out of scope on 2026-08-02.** The trigger this ticket is built on was
calibrated before being built, as scope step 3 required, and it does not
separate the population the ticket exists to rescue. Scope step 3 named this
outcome in advance — *"if they do not separate, say so — that is a finding, and
it kills the trigger"* — and it is the outcome that occurred.

Evidence, scripts and the full write-up:
[`.scratch/salvage-expansion/`](../../salvage-expansion/README.md). The probe
runs in about a second against the real embedder and is kept runnable.

### The bar named in this ticket was the wrong pillar

Before any measurement, a naming error had to be resolved. This ticket and
ADR 0010 §7 both name **Pillar 2** as salvage's non-regression bar and its
calibration corpus, inheriting the title *"Adversarial Semantic Recall &
Distractor Resistance"* from ADR 0007. But Pillar 2 measures
**`recallAt1: 1.0`, `recallAt5: 1.0`** (`benchmarks/reports/e2e-metrics.json`)
and is described in code as *"Pillar 2 — baseline (easy) recall"*
(`test/e2e/tier.ts:39`). The genuinely adversarial pillar is **Pillar 7**, added
later precisely because Pillar 2's distractors are only *lexically* noisy —
`test/e2e/adversarial-corpus.ts` says so in its header.

The maintainer settled it: **Pillar 7 is the bar.** That mattered less than
expected, because the calibration then invalidated the trigger regardless.

### The calibration

Best top-1 cosine, 308-entry corpus, real embedder:

| population | n | min | max | mean |
|---|---|---|---|---|
| gold **not**@1 (retrieval WRONG) | 5 | 0.6824 | **0.9516** | 0.7779 |
| gold@1 (retrieval RIGHT) | 3 | **0.6548** | 0.8347 | 0.7518 |
| nonsense (no answer exists) | 5 | 0.5097 | 0.6173 | 0.5713 |
| terse (`git`/`tdd`/`db`/`wasm`) | 4 | 0.5061 | 0.6156 | 0.5561 |

**The floor is inverted on the failures it was meant to catch.** Queries
retrieval got *wrong* score *higher* than queries it got right. `decoy-retry-budget`
— gold at rank 4, the worst case in the suite — carries the **highest**
similarity of anything measured, 0.9516. `decoy-index-rebuild`, already correct
at rank 1, carries the **lowest**, 0.6548. Every Pillar 7 failure is a
**confidently wrong** retrieval, not a weak one. There is no floor that fires on
`para-token-expiry`, `para-memory-growth` or `hop-ci-only-failure` without first
firing on a case that needs no rescue.

This is not a tuning problem. Expansion rewrites a query to find *more*; the
measured defect is that the embedder finds the wrong thing and is **more**
confident about it than when it is right. A different query does not fix a
ranking that is confidently inverted — that is a reranking problem, and a
different ticket than this one.

**The floor does separate "no answer exists" — but that half is inert against
the bar.** nonsense and terse top out at 0.6173, every real query starts at
0.6548, so a floor near **0.63** cleanly separates them, thin margin (0.038) and
small n notwithstanding. That is the `CLAUDE.md` *"try a broader keyword"*
population this ticket set out to automate. But it means salvage would **never
fire on any Pillar 7 case** — all of them sit at or above 0.6548 — so the A/B
the maintainer had just chosen as the bar is guaranteed to return delta 0.0.
Both candidate bars were inert, for opposite reasons: Pillar 2 because nothing
there is ever weak, Pillar 7 because nothing there is ever weak *enough*.

### ADR 0010 §2's stated premise is false

§2 justified this ticket's prerequisite — surfacing raw `similarity` — on the
grounds that *"the top hit of a nonsense query still scores ≥ 0.75"*. Measured,
nonsense queries score **0.4375–0.5565** and real queries **0.7896–0.9375**. On
this corpus `score` separated the no-answer population **better** than
`similarity` did: margin 0.233 against 0.038.

The §2 argument assumed `normRrf = 1.0` from a document ranking #1 in both the
semantic and the FTS list. A nonsense query produces **no FTS hits at all**, so
only one term of `rrfScore` is non-zero and `normRrf` caps at 0.5. The observed
0.4375 is exactly `0.75·0.5 + 0.25·((2−1)/4)` for the importance-2 filler. The
prerequisite did not survive its own justification, and `similarity` is **not**
surfaced — nothing in the tree needs it now, and the probe recomputes it.

ADR 0010 is amended accordingly (§1 and §2 withdrawn, §7's row for this ticket
struck); it remains **Accepted** because its other sections still govern `06`.

### What this leaves behind

- The `CLAUDE.md` *"try a broader keyword"* workaround **stays**. This ticket's
  deliverable to remove it is void.
- The `minScore` arithmetic uncovered here is sharp enough to ticket on its own
  and is filed as
  [27 — `minScore` Is Structurally Inert](27-minscore-is-inert.md), which
  inherits the usable 0.63 separating value as a candidate.
- **Confident wrongness is deliberately not graduated.** Pillar 7's paraphrase
  (0/2) and multi-hop (0/2) families losing to high-similarity decoys is a real
  measured defect, but the maintainer chose not to open it as fog or as a
  ticket. It is recorded here and nowhere else on purpose — if retrieval quality
  is picked up again, this is the record to start from.
- Ticket [09 — Cut and Publish 2.2.0-rc2](09-cut-rc2.md) drops `07` from its
  blockers and gains `26`.

## Comments

- 2026-08-02: Killed after calibration. Note for anyone reading this ticket as a
  precedent: the ticket was right to demand the floor be calibrated rather than
  guessed, and right to pre-commit to a kill if it did not separate. The cost of
  finding out was about one second of compute against a corpus that already
  existed. The design that ADR 0010 spent a whole grilling session on would have
  been built on a signal that points the wrong way.
