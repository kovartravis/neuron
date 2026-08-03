Type: task
Status: unclaimed
Blocked by: none
Band: 2.2.0-rc3

# 41 — Decontaminate the Ranking Score and Land the Lexical Gate

## Question

Ship every part of ticket [`27`](27-minscore-is-inert.md)'s conjunctive relevance
gate that is justified **structurally** rather than by a fitted constant — the
score decontamination, the lexical leg, the empty-result announcement, and the
relocation of the gate out of `exec.ts`. The one fitted number, the cosine floor,
belongs to [`39`](39-relevance-floor-validation.md) and is **not** in this
ticket's scope.

## Why this is separable and unblocked

`27` split the work on the "needs a fitted constant" line. Everything here rests
on algebra reproduced by live measurement, not on a threshold chosen to fit a
sample:

- The importance contamination is a **ranking defect present on every query**,
  provable from the formula and confirmed on the store.
- The lexical leg is a **predicate** (`normRrf > 0.5` ⟺ "the top hit has at least
  one FTS match"), not a tunable threshold.
- The announcement and the relocation are plumbing.

Measured on `27`'s 15 probes, this ticket alone rejects **4 of 5** irrelevant
queries and **0 of 15** relevant ones, with nothing to tune. The remaining
irrelevant query (`make me a sandwich`) is the cosine leg's job, in `39`.

**Nothing here waits on a benchmark**, which is why it is unblocked while `39`
runs.

## Scope

### 1. Remove `importance` from the ranking score

`src/index.ts:510-511`:

```
const normImp = (row.importance - 1) / 4;
const score = 0.75 * normRrf + 0.25 * normImp;
```

becomes `score = normRrf`.

- **Not** demoted to a tie-break. `27` §1 established that is a fiction:
  `semanticRank` and `ftsRank` are assigned uniquely per row
  (`src/index.ts:481-483`), so `rrfScore` ties are measure-zero; the only real
  tie group is the zero-similarity tail (`sr = fr = ∞ → rrfScore 0`), which never
  reaches top-k. Importance leaves the ranking path entirely.
- **`importance` remains a prune-only field** — see `27` §5. Do **not** remove
  the column, the `--importance` flag, the frontmatter key, the `impBar()`
  display, or `scanner/ingest.ts:53`'s `importance: 5`. Removing it would reverse
  ticket [`25`](25-prune-config-and-collision-fix.md)'s deferral, delete the only
  guard against [`23`](23-configurable-automatic-pruning.md)'s live hazard, break
  the markdown content hash mid-rc5, and pre-empt [`36`](36-configurable-frontmatter-schema.md).

**This is a user-visible ranking change, not just a filtering change.** It needs
a CHANGELOG entry saying so plainly: results will reorder for existing users,
and low-importance-but-relevant entries will surface that previously did not.

### 2. Surface raw cosine on the query result

`src/index.ts:476` computes `similarity` for ranking and then **discards it** —
only the blended score reaches the `Memory` object (`:513-523`). The cosine leg
in `39` cannot be built until this value is available to callers.

Add it to the returned shape (`src/models/memory.ts:22` neighbourhood) and to
`neuron memory query`'s JSON. Name it for what it is (raw cosine similarity),
distinctly from `score`, so the two are never confused by a later reader — the
confusion `27` and `39` both had to correct in ADR 0010's premise.

### 3. Implement the lexical leg

Reject a result whose `normRrf` is not `> 0.5` — algebraically, whose top hit has
**no FTS match at all**.

Implement it as the *predicate it is*, not as a configurable threshold that
happens to default to 0.5. A tunable knob here would invite exactly the
false-precision `27` §10 removed from `39`'s sweep: `normRrf` is bimodal, so
values between 0.5 and 0.97 describe nothing real.

Structure the gate so `39` can add the cosine leg as a **second conjunct**
without reshaping anything.

### 4. Move the gate into the retrieval layer, running on both paths

Today the filter is a single line in `src/commands/exec.ts:32`, reachable only
via `resolveExecCategories` (`src/config/neuronYaml.ts:299`), which nothing else
calls.

Move it so it applies to **both** `neuron exec` and `neuron memory query`
(`27` §7, maintainer ruling — one gate, one behaviour). Ticket
[`11`](11-recall-adapter-architecture.md)'s point 3 requires the floor to sit
under the injection ledger, and the hook path calls the query layer rather than
`neuron exec`; a gate stranded in `exec.ts` would have to be reimplemented there,
which is the two-disagreeing-gates hazard `27` and `39` were wired together to
prevent.

### 5. Announce zero results, with the rejected-candidate count

`src/commands/exec.ts:34` is `if (relevant.length > 0)`, so an empty result
prints nothing at all. That state is currently unreachable and becomes routine
once the gate works.

- **`neuron exec`** — one terse stderr line naming the command and the count of
  candidates rejected, e.g.
  `[neuron] 0 relevant learning(s) for "ls" — 5 candidates below relevance gate`.
- **`neuron memory query`** — an equivalent count field in the JSON, so an empty
  `results: []` is distinguishable from an empty store.

Rationale in `27` §6: silence conflates *"consulted and found nothing"* with
*"did not run"*, the conflation `35` and `28` both ruled against; and the count
is the diagnostic that makes the gate tunable at the point of use.

**Out of scope here:** whether the hook path emits this line into the model's
context. That is `11`/`12`/`13`'s call.

### 6. Fix the `onExec` rule-merge semantics

`src/config/neuronYaml.ts:312-313` merges every matching rule with `Math.max` on
`limit` and `Math.min` on `minScore`. **Both directions widen** — each additional
matching rule makes the result set strictly larger and the gate strictly looser,
never tighter.

On this repo's own `neuron.yaml` the `.*` rule matches everything, so `npm test`
and `git commit` resolve to `limit: 8` rather than 5 — the protocol's most-run
commands pull the largest payloads.

**Change to last-match-wins.** A rule written for `^(npm test|git commit)` is a
*more specific* statement than `.*`, and widen-on-merge lets the general rule's
looseness survive the specific rule's intent. It also makes the config non-local:
adding any broad rule silently loosens every narrow one, which cannot be debugged
by reading the file.

Folded in here at the maintainer's direction rather than split out — it is the
same defect class as the inert gate (a knob that structurally cannot tighten),
and fixing the gate while leaving the merge widening the payload would half-fix
the reported problem.

### 7. Leave `minScore` alone

No deprecation, no warning, no reinterpretation — `27` §8, maintainer ruling. No
release ships between here and `39`, so there is no published intermediate state
to protect, and the config surface is settled once, with the number, in `39`.

Verified free rather than assumed: after decontamination, within the top-5 window
`normRrf` runs **0.5000 / 0.4919 / 0.4841 / 0.4766 / 0.4692** — all above 0.35,
so `minScore` stays exactly as inert as it is today.

**Do not** reinterpret `minScore` as the cosine floor. A user carrying
`minScore: 0.35` would silently get a far weaker filter over a different
quantity, with no signal the meaning changed — the anti-pattern `35` ruled on.

## Acceptance

- [ ] `score` is `normRrf`; no `importance` term on the query path
- [ ] `importance` still gates `neuron memory prune`, still written by
      `scanner/ingest.ts`, still in frontmatter and the content hash — verified by
      test, since `27` §5 turns on it
- [ ] Raw cosine surfaced on query results, named distinctly from `score`
- [ ] Lexical leg rejects a top hit with no FTS match, on both `exec` and
      `memory query`
- [ ] Gate lives in the retrieval layer; `exec.ts` no longer owns a filter
      expression
- [ ] Zero-result announcement with rejected count, on both surfaces
- [ ] `onExec` merge is last-match-wins; `npm test` resolves to `limit: 5` on this
      repo's config
- [ ] `neuron exec -- ls` injects **0 entries** where it currently injects 5
      entries / 4,245 characters
- [ ] `27`'s 15 probes re-run as a regression fixture: 0 of 15 relevant rejected,
      4 of 5 irrelevant rejected
- [ ] CHANGELOG records the reordering as user-visible

## Deliberately not here

- **The cosine floor.** `39`'s single fitted constant, measured on
  non-self-referential data. This ticket's gate is one conjunct; `39` adds the
  second.
- **Removing `importance` altogether.** Downstream of `25`, which is deferred.
- **Config surface changes** — `minScore`'s fate, an off switch for the gate,
  any new key. All settled in `39` alongside the number.

## Comments

- 2026-08-03: Created by ticket `27`'s resolution, which split implementation on
  the "needs a fitted constant" line. Every number cited here is from `27`'s
  probes against **this repo's own store** and is used only to size the problem —
  none becomes a default.
