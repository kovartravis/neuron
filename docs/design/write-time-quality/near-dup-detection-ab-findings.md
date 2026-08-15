# Near-duplicate detection A/B findings — Ticket 7, Map — neuron 2.4.2

**Date:** 2026-08-15
**Ticket:** 7 — Validate Near-Duplicate Detection Approach (A/B Tests), child of
Map — neuron 2.4.2 ("write-time quality")
**Scripts:** `benchmarks/near-dup-ab/run-ab.ts` (A/B 1-3),
`benchmarks/near-dup-ab/ab4-counterfactual.ts` (A/B 4). Raw scores:
`benchmarks/near-dup-ab/raw-scores.json`,
`benchmarks/reports/near-dup-ab4-counterfactual.json`.

---

## TL;DR

Five measurements were run before Ticket 6 spends engineering time building
the widen-by-cosine → rerank → gate-on-bar near-dup detector Ticket 3
designed. The headline split:

- **A/B 1-3 (synthetic, isolated pairs): GO on reranking over raw cosine.**
  On a 40-pair labeled corpus, the reranker cleanly separates near-duplicate
  restatements from same-topic-different-fact hard negatives at a bar around
  **3** (own reranker-score scale — *not* the existing
  `RERANKER_ACCEPT_THRESHOLD = -8`, which is calibrated for a different,
  asymmetric task and does not transfer). Raw cosine gets close but never
  reaches a clean separation point on this corpus; the reranker does.
  Widen count **N=10** already gives 100% near-dup recall and adding more
  candidates (up to 50 tested) neither helps recall nor changes the
  false-accept picture, on this corpus.

- **A/B 4 (real store replay): the bar=3 recommendation does NOT transfer to
  this repo's actual content.** Replaying the proposed gate against all 683
  live entries in this repo's own store surfaced **214 new "duplicate" pairs**
  the gate would flag that today's shipped 0.97-cosine gate does not. The
  large majority are **not** genuine near-duplicates: they're pairs that
  share a narrative or structural *template* (this repo's `architecture`
  category's `"### 🧩 X (path) Primary X module containing core application
  capabilities..."` boilerplate, and `history`'s `"Wayfinder pickup on the
  neuron-X.Y.Z map: resolved ticket N..."` boilerplate) while describing
  completely different facts, plus pairs that are **by-design parallel
  records** across categories (a `decisions` entry and a `history` entry
  both describing the same ticket's resolution, which is exactly how this
  repo's own session-recording workflow is supposed to work). A concrete,
  clear false positive: two distinct `decisions` entries about the same
  pruning-ceiling topic — one about ticket 25 being pushed off, one about
  the importance-3 collision being deliberate — scored **4.72**, comfortably
  above the bar=3 that A/B 3's synthetic sweep recommended.

- **A/B 5 (false-positive friction on real iterative writes): answered
  directly by A/B 4**, which *is* a real-write-history replay. Friction is
  severe, not negligible — see the pruning-ceiling example above and the
  category breakdown below.

**Recommendation: conditional go, not a clean go.** The reranking-over-cosine
premise (A/B 1) holds and is worth keeping. The specific bar/N calibration
this ticket produced from isolated prose pairs does not survive contact with
this repo's own real content, dominated by two content shapes the synthetic
corpus didn't model: shared boilerplate templates, and intentional
cross-category restatement. **Ticket 6 should not build against a bar
calibrated purely on isolated pairs.** See §5 for what's now blocking it.

---

## 1. Method

Mirrors ticket 29/39's measure-first, sweep-the-frontier discipline
(`benchmarks/reranker-gate/calibrate-threshold.ts`), scaled to this task
rather than to LongMemEval's 500-question corpus — the question here is
whether reranking separates *entry-vs-entry equivalence* on short prose,
which a much smaller, hand-labeled corpus can answer, followed by a real
counterfactual pass against this repo's own store to check the answer
transfers.

### 1.1 Corpus (A/B 1-3)

`benchmarks/near-dup-ab/corpus.ts`: 40 labeled `{seed, candidate}` pairs
across 15 topic groups, extending Pillar 14's case-1 fixture:

- **near-dup** (15): candidate restates the seed's fact in different words.
- **related-distinct** (15): candidate shares the seed's topic/vocabulary
  but states a *different* fact — the hard negative a vocabulary-sensitive
  gate risks false-accepting.
- **unrelated** (10): candidate shares no topic — easy negative control.

Each group's near-dup/related-distinct/unrelated candidates share the
*exact same seed text*, plus 41 distractor-only seeds pad the pool to 56 so
widening to N=50 is meaningful (15 real topic seeds alone can't exercise
that leg).

### 1.2 Real-store replay (A/B 4)

All 683 live (non-superseded) entries across this repo's own
`architecture`/`decisions`/`history`/`learning`/`tickets` categories,
fetched via `neuron memory list --limit 2000 --json` per category. Two
clustering passes over freshly-computed embeddings (same `embed()` call
path production writes use):

- **baseline**: pairwise raw cosine, union-find, `SUPERSESSION_SIMILARITY_THRESHOLD`
  (0.97) — recomputes what `getStoreHealth()` already does.
- **proposed**: per entry, widen to top-10 by cosine, rerank each candidate,
  union-find on reranker score ≥ 3.

`getStoreHealth()`'s own live, authoritative result was also captured
directly (not recomputed) as a sanity anchor.

---

## 2. A/B 1 — reranking vs. raw cosine, own-seed score by label

| label | n | cosine (min / median / max) | rerank (min / median / max) |
|---|---|---|---|
| near-dup | 15 | 0.7879 / 0.8992 / 0.9569 | 4.35 / 6.31 / 8.52 |
| related-distinct | 15 | 0.4900 / 0.6189 / 0.7593 | -11.36 / -6.95 / 1.54 |
| unrelated | 10 | 0.3838 / 0.4322 / 0.5182 | -11.45 / -11.26 / -9.42 |

Own-pair separation (near-dup min vs. related-distinct max):

- **cosine**: 0.7879 vs. 0.7593 → gap **0.0286** — separated, but by a
  razor-thin margin. Consistent with ADR 0015 §2 and ticket 39: no
  comfortable intermediate cosine band exists on real text.
- **reranker**: 4.35 vs. 1.54 → gap **2.81** — separated with real margin.

This is the own-pair picture only (query vs. its true partner). §4 below is
the more decisive test: does *any other* entry in the pool false-accept.

**Cosine-only cross-pool check** (does *any* non-own seed in the widened
window clear a fixed cosine floor?), computed from the same cached scores:
at the best available cosine floor (0.7879, near-dup's own minimum),
related-distinct cross-pool false-accept is still **13% (2/15)**; at 0.80 it
drops to 7% but near-dup false-silence rises to 7%. **No cosine floor on
this corpus reaches 0% on both axes simultaneously.** The reranker does (§4,
bar 3-4). This is the actual go/no-go evidence for reranking over cosine —
not the own-pair gap alone.

## 3. A/B 2 — widen count (N) sensitivity

| N | near-dup recall | related-distinct recall | unrelated recall | reranker calls (this corpus) |
|---|---|---|---|---|
| 5 | 15/15 | 10/15 | 1/10 | 200 |
| 10 | 15/15 | 11/15 | 2/10 | 400 |
| 20 | 15/15 | 13/15 | 2/10 | 800 |
| 50 | 15/15 | 15/15 | 9/10 | 2000 |

"Recall" here means "own seed ranks within top-N by cosine" — near-dup hits
100% at every N tested because a true near-dup's cosine similarity to its
seed is (on this corpus) always its single closest match. Re-running the
bar sweep restricted to each N (§4, joint grid) shows the false-silence/
false-accept outcome is **identical across N=5 through N=50** — widening
past N=5 neither helps recall nor changes which candidates trigger a false
accept, on this corpus. **N=10 is chosen** as a real-store margin above the
observed floor (N=5 is empirically sufficient here, but this corpus's
distractor pool is unlikely to be as adversarial as a real store gets over
time), not because a larger N measurably helped.

## 4. A/B 3 — reranker bar frontier

Own-seed sweep (N=50 fixed):

| bar | false-silence (near-dup) | false-accept (related-distinct) | false-accept (unrelated) |
|---|---|---|---|
| -8 (existing `RERANKER_ACCEPT_THRESHOLD`) | 0% | 53% | 0% |
| -1 | 0% | 13% | 0% |
| 2 | 0% | 0% | 0% |
| **3** | **0%** | **0%** | **0%** |
| 4 | 0% | 0% | 0% |
| 5 | 20% | 0% | 0% |
| 8 | 80% | 0% | 0% |

Cross-pool sweep (does *any* non-own candidate in the widened window clear
the bar — the gate's actual real-world failure mode, since it doesn't know
which candidate is the "true" one):

| bar | related-distinct any-hit | unrelated any-hit |
|---|---|---|
| -8 | 93% | 30% |
| -1 | 27% | 0% |
| 2 | 13% | 0% |
| **3** | **0%** | **0%** |
| 5 | 0% | 0% |

**Bar = 3 is the tightest point where both false-silence and cross-pool
false-accept hit 0% simultaneously** on this corpus, joint across every N
tested (§3). The existing `RERANKER_ACCEPT_THRESHOLD = -8` would false-accept
93% of related-distinct hard negatives — direct, measured confirmation that
it does not transfer from the asymmetric query-passage task it was
calibrated for (ticket 29).

**This is where the synthetic-corpus recommendation ends. §5 is why it
doesn't survive contact with real content.**

## 5. A/B 4 — counterfactual on this repo's real store (the decisive result)

| | duplicate groups |
|---|---|
| today, authoritative `getStoreHealth()` (0.97 cosine) | 0 |
| today, recomputed from fresh embeddings (sanity check) | 4 |
| proposed (widen-10 / rerank / bar-3) | **42** |

214 new pairs the proposed gate catches that today's gate does not. Breaking
them down by what's actually driving the flag (not by category alone, since
the mechanism doesn't know *why* two entries are similar):

| source | count | genuine near-dup? |
|---|---|---|
| `architecture` boilerplate template collision | 17 | **No** — same scanner-generated template (`"### 🧩 X (path) Primary X module containing core application capabilities..."`), different module |
| Cross-category by-design parallel records (`decisions`+`history`, `history`+`tickets`, `history`+`learning`, `decisions`+`tickets`, `decisions`+`learning`) | 83 | **No** — this repo's own workflow records the same ticket's resolution once as a `decisions`/`learning` entry and again as a `history` log entry; that's the intended shape, not redundancy |
| Same-category, dominated by `history`'s "Wayfinder pickup on the neuron-X.Y.Z map: ..." narrative template | ~106 of 114 | **Mostly no** — same template, different ticket/work described |
| Same-category, genuine topic overlap without template scaffolding | a small remainder of the 114 | **Some yes** — see the concrete example below |

**Concrete false positive** (bar=3 would block this write today, requiring
`--supersedes`/`--not-a-reversal` for a legitimate new entry):

> A: *"Maintainer decision, after ticket 24's pruning A/B verdict
> (2026-08-01): ticket 25 (per-category prune config plus the
> default-collision fix) is pushed off entirely for now..."*
>
> B: *"Maintainer decision 2026-08-01: the default-importance-3 /
> default-maxPruneImportance-3 collision ticket 23 framed as a hazard is
> deliberate, not a bug to be fixed by separating the defaults..."*
>
> **Reranker score: 4.72** (above bar=3). Same topic (pruning defaults),
> genuinely different decisions — exactly the `related-distinct` shape A/B
> 1-3's synthetic corpus modeled, just not the *boilerplate-template* shape
> that turned out to dominate real content.

**Root cause of the gap between §4 and this section**: the 40-pair corpus
modeled "same topic, different fact" as a hard negative, but had no
category for "shares a repeated structural/narrative template regardless of
topic" — which turns out to be the dominant real-world false-positive
source in a repo that (a) auto-generates `architecture` cards from a fixed
template and (b) logs `history` entries through a fixed wayfinder-session
template. A reranker trained on natural-language relevance treats template
scaffolding as a real relevance signal, because in its training
distribution shared phrasing usually does correlate with shared meaning.

**Secondary observation, not chased further here**: `getStoreHealth()`'s
authoritative live result (0 groups) didn't match even the recomputed
0.97-cosine baseline (4 groups) on freshly-embedded content. Both passes
use the same `embed()` call and the same 0.97 threshold, so this is either
a real discrepancy between what's stored in this project's sqlite mirror
(md storage mode) and what a fresh embed of the same content produces, or a
content-normalization difference between what `memory list --json` returns
and what was actually embedded at write time. Worth a follow-up look before
trusting `getStoreHealth()` as ground truth for "today's" behavior, but out
of scope for this validation ticket.

## 6. Recommendation

- **A/B 1's core premise (reranking beats cosine on this task): GO.**
  Nothing here overturns it — the reranker still separates near-dup from
  related-distinct with real margin where cosine cannot (§2).
- **The bar=3 / N=10 calibration from A/B 1-3 is NOT ready to ship as
  Ticket 6's implementation target.** It would visibly misfire on this
  repo's own store on day one, dogfooding-fail style, blocking legitimate
  writes in `history` and cross-category record pairs constantly and
  occasionally blocking genuine independent `decisions` entries that share
  a topic.
- **Ticket 6 should not proceed against a bar calibrated from isolated
  pairs alone.** What's missing is a way to tell "shares a structural
  template" apart from "restates the same fact" — not solved here, and not
  this ticket's job to solve (a validation ticket measures, it doesn't
  design). See §7.

## 7. What this does *not* answer

- How to distinguish template/boilerplate collision from genuine semantic
  restatement. Candidate directions not evaluated here: excluding
  scanner-generated categories (`architecture`) from the gate entirely;
  scoping the gate to same-category comparisons only (would cut the 83
  cross-category pairs but not the 17 architecture or ~106 history
  same-category template collisions); a template-detection pre-filter
  before reranking; a much higher, separately-calibrated bar for
  boilerplate-heavy categories specifically. Genuinely open — this is real
  `/domain-modeling` work, the same kind the map's own Notes anticipated
  for Ticket 4's "restates vs. disagrees" distinction.
- The `getStoreHealth()` authoritative-vs-recomputed discrepancy (§5,
  secondary observation) — flagged, not diagnosed.
- Whether N sensitivity looks different on a corpus that includes
  boilerplate-template distractors deliberately (this run's distractor
  pool was hand-written prose, not scanner-generated templates) — the N=10
  choice in §3 predates this finding and wasn't re-tested against it.
