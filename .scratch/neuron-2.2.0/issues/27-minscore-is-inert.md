Type: grilling
Status: resolved
Blocked by: none
Band: 2.2.0-rc3 — design resolved here; implementation splits to `41` (structural,
unblocked) and `39` (the one fitted constant)

# 27 — `minScore` Is Structurally Inert

## Question

The default `minScore: 0.35` cannot exclude a top hit at any relevance, so
`neuron exec` injects at least one memory before every wrapped command no matter
how irrelevant. What should the relevance gate actually be — and should there be
one at all?

## Context

Found while calibrating ticket [`07`](07-query-expansion.md), which was killed.
This is the half of that work that survived.

### The arithmetic

`src/index.ts:475-483` computes, per row:

```
RRF_K   = 60
RRF_MAX = 2 / (RRF_K + 1)          // both lists rank it #1
rrfScore = 1/(60+semanticRank) + 1/(60+ftsRank)
normRrf  = rrfScore / RRF_MAX
normImp  = (importance - 1) / 4
score    = 0.75 * normRrf + 0.25 * normImp
```

Every row with a positive cosine gets a semantic rank, so **the top result
always has `semanticRank = 1`**, giving `rrfScore ≥ 1/61` and therefore
`normRrf ≥ 0.5`. Hence:

| importance | minimum possible top-hit `score` |
|---|---|
| 1 | **0.375** |
| 2 | 0.4375 |
| 3 (the default) | **0.500** |
| 5 | 0.625 |

The floor of the whole range is **0.375**, above the `0.35` default. The gate
can never fire on a top hit. This is not a threshold that is set too low — it is
a threshold outside the attainable range.

### Confirmed by measurement, not just algebra

Five nonsense queries against a 308-entry corpus of importance-2 filler scored
**0.4375, 0.5565, 0.4375, 0.4375, 0.4966** — the repeated 0.4375 is exactly
`0.75·0.5 + 0.25·0.25`, the formula's predicted floor for importance 2. Real
queries on the same corpus scored **0.7896–0.9375**. Full data and a re-runnable
probe: [`.scratch/salvage-expansion/`](../../salvage-expansion/README.md).

### Where it bites

`src/commands/exec.ts:32` — `matched.filter(m => (m.score ?? 0) >= minScore)`.
This is the pre-command memory injection behind `neuron exec`, resolved through
`resolveExecCategories` (`src/config/neuronYaml.ts:261-295`, default `0.35` at
`:127` and `:264`). Because the gate is inert, **every wrapped command gets at
least one memory injected**, relevant or not. `neuron memory query` surfaces the
same scores to agents deciding whether a result is worth trusting.

This matters more after rc3, not less: ticket `11`'s hook-based auto-injection
puts this on every agent turn.

### Two things this ticket must not assume

- **That the answer is a higher `minScore`.** The score is contaminated by
  `importance` — a high-importance irrelevant entry outranks a low-importance
  relevant one by up to 0.25, which is most of the usable range. Raising the
  threshold trades one wrong behaviour for another.
- **That raw `similarity` is obviously better.** Ticket `07` measured it: raw
  cosine separated no-answer queries from real ones by only **0.038**
  (≤0.6173 vs ≥0.6548), while `score` separated the same populations by
  **0.233**. A ~0.63 similarity floor is a *candidate*, inherited from `07`, not
  a conclusion — and `07` also proved raw similarity is **inverted** on
  confidently-wrong retrieval, so it is not a general quality signal either.

## Prior art in this map

ADR 0010 §2 asserted `minScore: 0.35` is "a far weaker filter than it appears".
That was correct and understated — it is not weak, it is inert. §2's companion
claim, that a nonsense query's top hit still scores ≥ 0.75, is false and is
corrected in ADR 0010's 2026-08-02 amendment.

## Suggested starting questions for the grilling

1. Is a relevance gate the right primitive at all, or should `neuron exec`
   inject a fixed small number of results and let the consumer judge?
2. Should `score` stop mixing relevance with importance? Importance is a
   *tie-break* concern; folding it into the number a filter reads is what makes
   the filter unusable.
3. Is "nothing is relevant enough — inject nothing" a state the protocol can
   even express today, and what do agents do with an empty result?
4. Does this need fixing before rc3's auto-injection multiplies it by every
   agent turn, or is it independent?

## Comments

- 2026-08-02: Filed from ticket `07`'s calibration. Deliberately left unbanded —
  it is a live defect in shipped 2.1.x behaviour rather than a 2.2.0 feature, and
  it does not gate the rc2 cut. Typed `grilling` because the fix is a design
  question, not a threshold change.

## Comments

- 2026-08-03: Wired to [39 — Relevance Floor Validation](39-relevance-floor-validation.md),
  created during `11`'s grilling. **These are the same problem from two ends** — a
  relevance floor designed in `39` and a repaired `minScore` here are two
  thresholds over the same retrieval, and shipping them independently invites a
  system with two disagreeing gates. This ticket's own record already anticipated
  it: the defect *"gets sharply worse after rc3, when hook-based auto-injection
  puts it on every agent turn"*, which is exactly what `11` designs. Work them
  together, or this one first. This ticket's evidence also constrains `39`'s
  design directly — raw cosine separated no-answer queries by only 0.038 against
  `score`'s 0.233, so `39` now sweeps three gate quantities rather than assuming
  cosine.

## Answer

**The diagnosis in the question was wrong, and the correction is the finding.**
`minScore` is not a threshold set too low, and it is not merely "outside the
attainable range" as the ticket body argued. **The number it reads is unfit to
gate on at all**, for two independent reasons — one this ticket predicted
algebraically, one it did not anticipate. So the fix is not a threshold; it is a
change to what the gate reads.

Resolved by grilling on 2026-08-03, against 15 probes on this repo's live
274-entry store (71 `learning` entries). **Every number below is
self-referential and none of it becomes a default** — see *Evidence caveat*.

### 1. `score` blends relevance with importance, and importance wins often

Predicted by the ticket, now measured live rather than algebraically. Top hits
for `ls`, by raw cosine, with `score` decomposed:

| simRank | cosine | importance | `score` | shown to the user as |
|---|---|---|---|---|
| 1 | 0.5487 | 3 | 0.5000 | *(buried — falls out of top-5)* |
| 3 | 0.5268 | **5** | **0.6131** | **1st** |

The entry retrieval judged **most** similar is displaced by the one it judged
**third**, purely on importance. This is not a gate defect — it is a **ranking
defect in shipped 2.1.x**, present on every query, gate or no gate. 186 of this
store's 274 entries sit at the default importance 3 with no 1s or 2s, so the
term largely encodes *"did the author remember to pass `--importance`"* rather
than anything about the query.

**Ruling: `importance` is removed from `score`, which becomes `normRrf`.**

The ticket's suggested framing — demote importance to a tie-break — was
considered and **rejected as a fiction**. `semanticRank` and `ftsRank` are
assigned uniquely per row (`src/index.ts:481-483`), so `rrfScore` ties are
measure-zero. The only real tie group is the zero-similarity tail
(`sr = fr = ∞ → rrfScore 0`), which never reaches top-k. There is no tie-break
job to give it. Importance leaves the ranking path completely.

### 2. `normRrf` is a keyword-presence detector, not a relevance score

Not anticipated by the ticket. Decontaminating `score` does **not** by itself
produce a gateable quantity. Measured, 5 relevant vs 5 irrelevant queries:

| query | `normRrf` | cosine | FTS hits |
|---|---|---|---|
| `npm test` | 0.9766 | 0.6718 | 22 |
| `git commit` | 1.0000 | 0.6780 | 8 |
| `tree-sitter grammar caching` | 1.0000 | 0.8123 | 9 |
| `fix the frontmatter reader` | 0.9919 | 0.7269 | 41 |
| `how does prune work` | 0.9841 | **0.6072** | 15 |
| `ls` | **0.5000** | 0.5487 | 0 |
| `how do I deploy to kubernetes` | **0.5000** | 0.6074 | 0 |
| `what is the capital of France` | **0.5000** | 0.4710 | 0 |
| `pytorch training loop` | **0.5000** | **0.6143** | 0 |
| `make me a sandwich` | **0.9692** | **0.4843** | 9 |

`normRrf` is effectively **bimodal**: exactly 0.5000 when FTS matches nothing,
~0.97–1.0 when it matches anything. Almost no intermediate range. Separation is
**0.476** where raw cosine gives **0.064** — and that 0.064 independently
reproduces ticket `39`'s 0.061 pilot margin from a different corpus, which is
worth more than either number alone.

Its one failure is the one this codebase already documented. `make me a
sandwich` scores 0.9692 because `"make"*` prefix-matched 9 entries.
`src/components/fts-query.ts`'s own header comment describes the mechanism
exactly: *"a document matching a single common word enters the FTS ranking at
all — and if it is the only match, it enters at rank 1 and collects the full RRF
contribution."* The stopword list caught `do`/`we`/`use`; it does not catch
`make`.

### 3. The gate is conjunctive, because the two legs fail on disjoint sets

**Ruling: require lexical corroboration (`normRrf > 0.5`) AND a cosine floor.**

This is not belt-and-braces. It is load-bearing in both directions:

- `pytorch training loop` (cos **0.6143**) and `kubernetes` (cos **0.6074**) sit
  **above** the lowest genuinely-relevant query, `how does prune work` (cos
  **0.6072**). **No cosine floor can reject them without a false silence.** Only
  the lexical leg catches them.
- `make me a sandwich` passes any plausible `normRrf` threshold. **Only cosine
  catches it**, at 0.4843 — the lowest of all ten.

The conjunction also makes the cosine floor's job far easier: it no longer has
to separate relevant from *all* irrelevant (margin 0.064, hopeless), only
relevant from *irrelevant-that-got-a-stray-lexical-hit* — margin 0.6072 vs
0.4843 = **0.123**, roughly double `39`'s pilot margin.

Note precisely what the lexical leg is: `normRrf > 0.5` is algebraically
identical to **"the top hit has at least one FTS match."** `sr=1` with no FTS
gives exactly 0.5; any FTS hit exceeds it. It is a **topicality** test — does
this query's vocabulary occur in this store's domain at all — not a relevance
test. Relevance is the cosine leg's job.

### 4. The false-silence risk was probed and did not materialise

The lexical leg's obvious hazard is rejecting a semantically perfect query that
shares no vocabulary. Five on-topic paraphrases, written deliberately to avoid
the store's terminology:

| paraphrase | `normRrf` | cosine | FTS hits |
|---|---|---|---|
| "why was the tiny language model switched off" | 0.9841 | 0.6717 | 6 |
| "what goes wrong when an agent writes a note without saying how vital it is" | 1.0000 | 0.6329 | 29 |
| "the thing that reads structured headers at the top of a file is broken" | 0.9839 | 0.6442 | 24 |
| "how do I stop old notes disappearing" | 0.9841 | 0.6370 | 17 |
| "which words get thrown away before searching" | 0.9692 | 0.6312 | 6 |

All five pass both legs, and each retrieved the correct entry. The mechanism is
that `cleanFtsQuery` emits **prefix** terms OR'd together, so ordinary words
(`note`, `file`, `words`, `searching`) land hits. **This is a probe, not a
result** — 5 paraphrases against one self-referential store. Establishing it
properly is now `39`'s first job.

### 5. `importance` survives as a prune-only field — not removed in 2.2.0

Removal was evaluated at the maintainer's direction, not waved away. Every
remaining consumer was enumerated:

| consumer | site | nature |
|---|---|---|
| `neuron memory prune` ceiling | `src/index.ts:870`, default 3 inclusive (`src/commands/memory.ts:145`) | **only behavioural use** |
| `neuron scan` writes cards at `importance: 5` | `src/scanner/ingest.ts:53` | also prune — shielding cards from the ceiling |
| dashboard `impBar()` | `src/ui/html.ts:350` | display only |
| frontmatter + content hash | `mdStorageAdapter`, `src/storage/mdVectorSync.ts:40` | plumbing |
| `--importance` flag, column + CHECK | `src/commands/utils.ts`, `src/index.ts:305` | surface + schema |

So the honest finding is that **once it leaves the score, `importance` is a
prune-only field.** It is nonetheless **kept in 2.2.0**, for four reasons in
descending force:

1. **Removing it reverses a deferral by the back door.** Importance-serves-only-prune
   makes *"should importance exist"* strictly downstream of *"should prune
   exist"* — which is ticket [`25`](25-prune-config-and-collision-fix.md),
   deferred by the maintainer 2026-08-01 with *do not implement*. Deciding
   prune's fate from inside `27` is outside this ticket's scope.
2. **It is the only live guard against ticket [`23`](23-configurable-automatic-pruning.md)'s
   unfixed hazard** — default importance 3 == default ceiling 3, compared
   inclusively. Pillar 10 measures 9 of 12 entries deleting at the default, with
   `--importance` the sole thing saving the survivors. Removing importance
   without removing prune deletes the only protection.
3. **Ticket [`26`](26-remove-model-importance-inference.md) set the precedent**:
   it kept the `enriched_at` column after killing the job that wrote it, because
   *"dropping a column makes an rc1/rc2 database non-downgradable."* Same
   argument, same band.
4. **It is inside the markdown content hash** (`mdVectorSync.ts:40`), so removal
   rehashes every entry and rewrites every `.md` file — mid-flight with rc5's
   `29`/`35`/`36`/`37`. Ticket `36` has not yet decided whether `importance` is a
   declared frontmatter field; pre-empting that from here collides with it.

This finding feeds `25` whenever the deferral lifts. It does not act on it.

### 6. Zero results is a legitimate output, and is announced

`src/commands/exec.ts:34` is `if (relevant.length > 0)`, so an empty result
prints **nothing whatsoever**. That state is currently unreachable; once the gate
works it becomes the common case for unrelated commands.

**Ruling: announce it, with the rejected-candidate count** — a terse stderr line
for `exec`, an equivalent field in `neuron memory query`'s JSON so an empty
`results: []` is distinguishable from an empty store.

Silence would conflate *"consulted the store and found nothing"* with *"did not
run."* That is the most repeated principle on this map: `35` ruled *"a missing
field is a fact about the file, not a value to guess"*; `28` added the bootstrap
seed precisely so *"not seeded yet"* and *"a human deleted everything"* stop
being the same state. The count is also the diagnostic that makes the gate
tunable — "5 candidates, all rejected" versus "0 candidates" is the difference
between a gate set too tight and an empty store — and it is the same signal
`39`'s deliverables already ask to expose in `neuron status`.

**Left to `11`/`12`/`13`, not decided here:** whether the hook path emits that
line into the model's context. Recommendation is terminal-only — injecting "I
found nothing" every turn spends context to say nothing.

### 7. The gate moves into the retrieval layer and runs on both paths

`minScore` exists only under `pullRules`, and `resolveExecCategories` is called
**only** from `src/commands/exec.ts:19`. The gate is therefore exec-only today,
and `neuron memory query` has no gate at all.

That is incompatible with ticket [`11`](11-recall-adapter-architecture.md)'s
point 3 — *"the relevance floor sits underneath so weak matches never enter the
ledger"* — because the hook path calls the query layer, not `neuron exec`. A gate
living inside `exec.ts` is invisible to it, and reimplementing it there would
create exactly the two-disagreeing-gates hazard `27` and `39` were wired together
to prevent.

**Ruling (maintainer, overriding the proposed split): the gate lives in the
retrieval layer and runs on *both* paths** — `neuron exec` and `neuron memory
query` alike. A gate-on-for-unsolicited / off-for-explicit split was proposed and
declined; one gate, one behaviour.

Consequence: `CLAUDE.md` step 1's *"If no results return, try a broader
keyword"* becomes a live path rather than a theoretical one.

### 8. `minScore` stays exactly as it is

Deprecate-and-warn was proposed, on the precedent of `neuron learn`/`history`,
`--scope` (`38`) and `md-only`/`dual` (`28`). **Declined by the maintainer**: no
release ships between here and `39`, so there is no published intermediate state
to protect, and the final config surface should be settled once — in the same
step that supplies the number.

This costs nothing, and that is verifiable rather than assumed. After
decontamination, within the top-5 window `normRrf` runs **0.5000 / 0.4919 /
0.4841 / 0.4766 / 0.4692** — all above 0.35. `minScore` remains exactly as inert
as it is today: no behaviour change, nothing to warn about.

**What was rejected outright:** *reinterpreting* `minScore` as the new cosine
floor. A user carrying `minScore: 0.35` would silently get a cosine floor of
0.35 — a different and far weaker filter over a different quantity, with no
signal that the meaning changed. That is precisely the anti-pattern `35` ruled
on: *"reader fallbacks that supply plausible defaults are worse than errors,
because they convert a human's edit into fabricated data with no signal."*

An **off switch** for the gate was proposed as a support-liability hedge and
folded into the same deferral — it is config surface, and config surface is
settled with `39`.

### 9. Work splits on the "needs a fitted constant" line

Following this map's grilling→task precedent (`05`→`06`, `23`→`24`/`25`,
`28`→`29`):

- **[41 — Decontaminate the Ranking Score and Land the Lexical Gate](41-decontaminate-score-and-lexical-gate.md)**
  — task, **unblocked**, band rc3. Everything justified by *structure* rather
  than by a fitted number, so it ships without waiting on a benchmark: it
  already rejects 4 of 5 irrelevant probes and 0 of 15 relevant ones, with no
  threshold to tune.
- **[39 — Relevance Floor Validation](39-relevance-floor-validation.md)** — lands
  the cosine leg, the single fitted constant, on non-self-referential data.
  **`39`'s design is rewritten by this resolution** (below).

### 10. `39`'s design is superseded by this ticket

`39` was written to sweep **three** gate quantities in a 1-D sweep: raw cosine,
hybrid `score`, and `normRrf` alone. Two of those are now moot:

- **`score` no longer exists in gateable form** — importance is out of it, so the
  "hybrid score" arm is the `normRrf` arm.
- **`normRrf` is not a tunable threshold** — it is bimodal at 0.5, so sweeping it
  0.50→0.70 in 0.02 steps measures one binary predicate ten times.

What `39` should measure instead is narrower and stronger:

1. **The cosine floor, conditioned on the lexical leg having already fired.** A
   1-D sweep over a much easier discrimination (margin 0.123 rather than 0.064).
2. **The lexical leg's own false-silence rate**, on LongMemEval's paraphrased
   questions. This is the claim §4's 5 probes cannot support, and it is the one
   that can sink the design.

`39`'s three-part bar — zero recall regression, measurable volume reduction,
**false silence 0%** — is unchanged and still correct.

### Evidence caveat

**All 15 probes are against this repo's own store**, which is denser on neuron's
internals than any real user's store, and which was written by the same project
whose prose is being retrieved. This is the exact weakness `39` exists to fix,
named in its own body. Accordingly:

- **`41` ships only what is justified structurally** — a ranking defect proven by
  algebra and reproduced live, a predicate with no constant in it, and an output
  line. No number in this resolution becomes a default.
- The one number that *is* fitted, the cosine floor, is `39`'s and lands on
  LongMemEval.

This is the posture tickets `06`, `23` and `24` each arrived at the hard way, by
reversing a spec that had asserted a measurement in advance.

### Measured impact

`neuron exec -- ls` today injects **5 entries, 4,245 characters** of stderr
before a command with no relationship to anything in the store. Under `41`'s
lexical leg alone, it injects none and prints one line.
