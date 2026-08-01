Type: task
Status: unclaimed
Blocked by: 05
Band: 2.2.0-rc2

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
