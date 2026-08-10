Type: task
Status: unclaimed
Blocked by: none
Band: context cost

# 17 — Antagonistic Recall: Does Neuron Abstain When Nothing Is Relevant?

## Question

For a query with **no relevant entry anywhere in the store**, does neuron
actually return nothing — or does the shipped relevance gate (ADR 0012,
ticket 41) let an irrelevant top hit through anyway? Every existing recall
benchmark measures whether the *right* memory beats *wrong* candidates when
a relevant memory exists. None of them measure the mirror failure: injecting
context when there was nothing to inject in the first place.

## Context

ADR 0012 opens with exactly this failure, observed live: `neuron exec -- ls`
— a command with no relationship to anything recorded — injected 5 entries,
4,245 characters, because the pre-`41` gate was structurally inert. Ticket
`41` fixed the mechanism (`queryGated` in `src/index.ts`, rejecting any
result whose top hit has no FTS match — algebraically `ftsMatched === true`
is the whole gate today) but the ADR is explicit that no cosine floor
shipped: ticket `39` measured the floor question on LongMemEval and found no
threshold cleared the bar, so the shipped gate is **lexical-only**. A query
that shares even one incidental keyword with something in the store still
clears it — nothing currently measures how often that happens on genuinely
unrelated queries.

Three things already exist adjacent to this and none of them answer it:

- **Pillar 7 (`test/e2e/adversarial-recall.test.ts`, `adversarial-corpus.ts`)**
  scores ranking *among* hard negatives that share a topic with the gold —
  every query in that corpus has a real answer in the store. It cannot
  detect a false accept on a query with no answer at all.
- **`benchmarks/longmemeval/relevance_gate_eval.py` (ticket 39) already
  builds the right fixture** — Run 3's negative control queries a
  different, randomly-chosen partition guaranteed to share no gold evidence
  with the query — but only records `neg_r1_cosine`'s distribution. It never
  checks `ftsMatched` on that negative control, so the one number this
  ticket needs (how often the shipped gate actually accepts a no-evidence
  query) was never computed, even though the harness that could compute it
  cheaply already exists and already ran.
- **The map's own fog, "Confidently-wrong retrieval is unowned"**: a
  `neuron-2.2.0` measurement found raw cosine is *higher*, not lower, on
  queries retrieval got wrong than on queries it got right — meaning
  incidental lexical or topical overlap can look confident while being
  wrong. That fog item is about a wrong-but-present answer; this ticket is
  its cheaper, sharper-edged sibling — no answer present at all — and
  should settle first since it needs no adjudication of "wrong," only
  "present vs. absent."

## Scope

1. **New resident E2E pillar** (`Pillar 13: Antagonistic Recall &
   Abstention`), added to the vitest suite the same way Pillar 7 was:
   reuse Pillar 7's populated store (filler + hard negatives + golds already
   built by `adversarial-corpus.ts`), but query it with a corpus of prompts
   that share no topic, keyword, or concept with anything seeded — genuinely
   off-topic asks (weather, an unrelated codebase question, small talk) —
   not just absent-gold variants of existing topics. For each, call
   `queryGated` directly and assert `results.length === 0` /
   `rejected === 1`. Metric: **false-accept rate** — the fraction of
   antagonistic queries where the gate still returns a top hit — is the
   pillar's headline number, reported even if it's 0%.
2. **Extend `relevance_gate_eval.py`'s existing negative control** (Run 3)
   to also capture `neg_r1_fts` (the gate's real accept/reject decision on
   the cross-partition query, not just its cosine) and report the same
   false-accept rate on LongMemEval's real conversational corpus, alongside
   the false-silence rate ticket 39 already reports for the opposite
   failure mode. No new ingestion or fixture work — the negative-control
   retrieve() call already runs every time this script does; it only needs
   to read a field it's already computing (`ftsMatched`) and wasn't
   recording.
3. **Register the new pillar** in `benchmarks/e2e-runner.js` per the
   existing per-suite metrics-file convention (see how Pillar 7/9 wire into
   `adversarial-metrics.json`).
4. **Measurement only, matching ticket 39's own posture**: this ticket
   reports the false-accept rate on both corpora honestly, including a
   nonzero one. It does not attempt a fix (e.g., a cosine floor, an
   LLM adjudication pass) — if the number is bad enough to act on, that's a
   new ticket informed by a real measurement, the same split `39`
   (measure) → `41` (ship) already used.

## Verification

- Resident pillar's antagonistic corpus shares no keyword/topic with
  Pillar 7's seeded store (spot-checked, not just asserted) — a false
  "abstains" result from a corpus that accidentally overlaps would be
  worthless.
- `relevance_gate_eval.py`'s new negative-control field reuses the retrieve()
  call already in the loop — no added LongMemEval ingestion cost.
- Both false-accept numbers are written to their respective results/metrics
  files and printed, pass or fail.
- New pillar registered and green (or honestly red, per ADR 0012's own
  "report the spread honestly" discipline) in a real `benchmarks/e2e-runner.js`
  run.

## Deliverables

- [ ] `test/e2e/antagonistic-corpus.ts` (or an addition to
      `adversarial-corpus.ts`) — off-topic query set
- [ ] `Pillar 13: Antagonistic Recall & Abstention` added to
      `test/e2e/adversarial-recall.test.ts` (or a new suite file) and wired
      into `benchmarks/e2e-runner.js`
- [ ] `relevance_gate_eval.py` updated to record and report `neg_r1_fts` /
      false-accept rate alongside the existing false-silence measurement
- [ ] Results committed under `benchmarks/reports/` and
      `benchmarks/longmemeval/outputs/relevance_gate_longmemeval.json`

## Answer

(none yet)

## Comments
