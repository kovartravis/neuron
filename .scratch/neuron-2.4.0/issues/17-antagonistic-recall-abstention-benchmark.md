Type: task
Status: resolved
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

Resolved 2026-08-11. Built both measurements per Scope; the two disagree
sharply, which is itself the finding.

**Resident E2E pillar — `Pillar 13: Antagonistic Recall & Abstention`**
(`test/e2e/adversarial-recall.test.ts`, corpus in the new
`test/e2e/antagonistic-corpus.ts`). 19 genuinely off-topic queries across four
families (general-knowledge, weather-nature, small-talk, unrelated-codebase),
each verified programmatically — not just eyeballed — to share no
FTS-prefix-matching token with anything in Pillar 7's populated store
(fillers, hard negatives, superseded entries, golds). Calls `queryGated`
directly against that shared store and asserts `results.length === 0` per
query. **False-accept rate: 0/19 (0%)**, real run against the real embedder
and the real shipped gate (`ftsMatched === true` predicate, ticket 41),
registered and green in a real `benchmarks/e2e-runner.js` sanity-tier run —
it required no new wiring in the runner itself, since the suite file was
already in `SUITES` and the pillar writes into the already-registered
`adversarial-metrics.json` via the shared `MetricsRecorder`.

**LongMemEval negative control** (`relevance_gate_eval.py`'s Run 3, now
recording `neg_r1_fts` alongside the `neg_r1_cosine` it already computed — no
new ingestion, the retrieve() call already ran every time this script does).
Real run: 500 questions, 23,867 documents. **False-accept rate: 499/500
(99.80%)**, uniform across every question category (100% on five of six,
98.6% on `single-session-user`). Full results:
[relevance_gate_longmemeval.json](../../../benchmarks/longmemeval/outputs/relevance_gate_longmemeval.json).

**Why the two numbers disagree this sharply — not a contradiction, a
corpus-construction difference.** The resident pillar's antagonistic queries
were hand-built to share zero vocabulary with the store by design (that's
the whole point of the family list: cooking, geography, sailing, small talk —
domains with no lexical contact with a software-engineering memory store).
LongMemEval's negative control instead draws its "wrong" partition from the
*same* corpus family as the query — real, paraphrased, everyday conversational
text — so a cross-partition query and its accidental partition routinely
share ordinary words (names, common verbs, topic nouns) even with zero
semantic relationship. The shipped gate's `cleanFtsQuery` OR-across-any-word
design (confirmed at ticket 11's own dry-run) means *any* shared token
clears it. **0% is the ceiling case (adversarially disjoint vocabulary);
99.80% is closer to the realistic floor for natural-language cross-topic
queries against a natural-language store.** Neither number is wrong; they
measure different antagonism shapes, and the gap itself is the answer to the
map's "Confidently-wrong retrieval is unowned" fog item's easier sibling
question — abstention on no-evidence queries is real only when the query's
vocabulary is genuinely disjoint from the store's, which is not the common
case for natural conversational corpora.

**Measurement only, per Scope item 4 — no fix attempted.** The 99.80% number
is bad enough that a fix is clearly warranted, but per this ticket's own
posture (matching ticket 39 → ticket 41's measure-then-ship split), that's a
new ticket informed by this measurement, not folded in here.

**One off-band finding, unrelated to this ticket's own changes.** The real
`benchmarks/e2e-runner.js` sanity-tier run that confirmed Pillar 13's green
result also surfaced `Pillar 8: Multi-Process Contention & Crash Recovery`
failing red — `no such column: "scope"` / `duplicate column name: scope`
during concurrent multi-process database init, reproduced again in isolation
(`vitest run test/e2e/concurrency-stress.test.ts -t "Pillar 8"`). Confirmed
unrelated to this ticket's diff (only `antagonistic-corpus.ts`,
`adversarial-recall.test.ts`, and `relevance_gate_eval.py` touched — no
schema, migration, or concurrency code) and squarely in the territory
[18](18-fix-concurrent-write-data-loss.md) already charters (racy
read-modify-write cycles in the markdown storage layer). Not fixed here —
flagged for whichever session picks up `18`.

**Deliverables, all shipped:**
- `test/e2e/antagonistic-corpus.ts` — the 19-query off-topic set, with its
  own verification note on how disjointness was checked.
- `Pillar 13: Antagonistic Recall & Abstention` in
  `test/e2e/adversarial-recall.test.ts`, registered in
  `benchmarks/e2e-runner.js` (no code change needed — automatic via the
  existing `SUITES`/`extraMetrics` convention).
- `relevance_gate_eval.py` updated and re-run for real against the full
  LongMemEval-S split; `neg_r1_fts`/false-accept rate reported as `run4` in
  its JSON output and console report, alongside the existing `run2`
  false-silence measurement.
- Results committed: `benchmarks/reports/adversarial-metrics.json` (Pillar 13
  detail) and `benchmarks/longmemeval/outputs/relevance_gate_longmemeval.json`.

Unblocks nothing directly (no ticket here lists it as a blocker) — its
99.80% false-accept measurement is the input a future ticket (a cosine floor,
or an LLM adjudication pass) would need, mirroring how `39`'s measurement fed
`41`.

## Comments
