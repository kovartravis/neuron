Type: task
Status: unclaimed
Blocked by: 05
Band: 2.2.0-rc2

# 07 — Query Expansion for Terse Queries

## Question

Should a terse query be rewritten by the 0.5B model before hybrid search, and
does that measurably improve recall enough to justify sitting on the interactive
path?

## Context

`CLAUDE.md` today contains a manual workaround for this exact problem:

> *If no results return, try a broader keyword (`git`, `tdd`, `db`, etc.).*

That instruction exists because terse queries embed poorly. This ticket automates
it: expand the query into richer search text before it reaches hybrid search
(BGE semantic + FTS5 keyword, fused by RRF).

Two known constraints from the codebase and store:

- BGE requires **asymmetric embedding** — queries go through `embedQuery()` with
  the `"Represent this sentence for searching relevant passages: "` prefix, while
  passages use raw `embed()`. Expansion happens **before** that prefixing, and
  must not disturb it.
- This is the **interactive** path, and after rc3 auto-injection it runs on every
  turn. The ~1.5s model latency is the central risk, not the quality.

## Scope

1. Expand terse queries into richer search text ahead of hybrid search.
2. Cache aggressively by query hash — repeated queries must cost nothing.
3. Respect the latency ceiling from ticket `05`, including its timeout-and-fall-
   through behaviour. A slow expansion must degrade to the raw query, never
   stall recall.
4. Decide where expansion applies: semantic side only, keyword side only, or
   both. Expanded text may help BGE while *hurting* FTS5 precision — measure
   rather than assume, and consider expanding only the semantic leg.
5. Leave `--categories` filtering and scoring thresholds untouched.

## Verification

- Pillar 2 of the E2E suite (Adversarial Semantic Recall & Distractor Resistance)
  is the natural home. Expansion that improves plain recall while weakening
  distractor resistance is a net loss and must be caught here.
- Build a fixed set of deliberately terse queries (`git`, `tdd`, `db`, `wasm`)
  with known-good expected hits, and measure before/after.
- Record p50/p95 added latency, warm and cold cache.

## Deliverables

- [ ] Query expansion ahead of hybrid search, behind the `05` latency budget
- [ ] Query-hash cache
- [ ] Decision + evidence on semantic-only vs both legs
- [ ] Pillar 2 coverage; terse-query benchmark set with before/after numbers
- [ ] Recorded p50/p95 latency impact
- [ ] Remove the "try a broader keyword" workaround from `CLAUDE.md` if it lands
