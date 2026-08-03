# ADR 0012 — Relevance Gate and Score Decontamination

- **Status:** Accepted (2026-08-03)
- **Amends:** [ADR 0001 — Hybrid Search RRF](0001-hybrid-search-rrf.md) — the
  fused score's composition changes
- **Relates to:** [ADR 0010 — LLM Job Guardrails](0010-llm-job-guardrails.md) §2,
  whose account of `minScore` this ADR corrects for the second time
- **Ticket:** [27 — `minScore` Is Structurally Inert](../../.scratch/neuron-2.2.0/issues/27-minscore-is-inert.md)
- **Implemented by:** [41](../../.scratch/neuron-2.2.0/issues/41-decontaminate-score-and-lexical-gate.md)
  (structural) and [39](../../.scratch/neuron-2.2.0/issues/39-relevance-floor-validation.md)
  (the one fitted constant)

## Context

`neuron exec` filters pre-command memory injection through
`matched.filter(m => (m.score ?? 0) >= minScore)` with a default `minScore` of
`0.35`. ADR 0010 §2 described this as *"a far weaker filter than it appears"*.

That was understated. The gate is **inert**: it cannot reject a top hit at any
relevance, so every wrapped command receives an injection regardless of
relevance. Measured on this repo's live store, `neuron exec -- ls` — a command
with no relationship to anything recorded — injects **5 entries, 4,245
characters** of stderr.

Ticket `27` was filed to raise the threshold. Grilling it found the threshold is
not the problem: **the quantity the gate reads is unfit to gate on**, for two
independent reasons.

### 1. The fused score blends relevance with importance

`src/index.ts:503-511` computes:

```
normRrf = rrfScore / RRF_MAX          // RRF_MAX = 2/(RRF_K+1), RRF_K = 60
normImp = (importance - 1) / 4
score   = 0.75 * normRrf + 0.25 * normImp
```

Importance can move the score by up to 0.25 — most of the usable range. This is
not theoretical. Top hits for `ls` on the live store, by raw cosine:

| simRank | cosine | importance | `score` | presented as |
|---|---|---|---|---|
| 1 | 0.5487 | 3 | 0.5000 | *falls out of top-5* |
| 3 | 0.5268 | **5** | **0.6131** | **1st** |

The entry retrieval judged **most** similar is displaced by the one it judged
**third**. This is a **ranking defect on every query**, independent of any gate.
186 of the store's 274 entries sit at the default importance 3 with no 1s or 2s,
so the term largely encodes *whether the author passed `--importance`* rather
than anything about the query.

### 2. The rank-derived remainder is a keyword detector, not a relevance score

Removing importance does not by itself yield a gateable quantity. `normRrf` is
**bimodal**: exactly `0.5000` when the FTS leg matches nothing, `~0.97–1.0` when
it matches anything. Algebraically, `normRrf > 0.5` is identical to *"the top hit
has at least one FTS match"* — `sr=1` with no FTS gives exactly 0.5.

Measured across 10 queries, `normRrf` separates relevant from irrelevant by
**0.476** where raw cosine separates them by **0.064**. That 0.064 independently
reproduces ticket `39`'s **0.061** pilot margin from a different corpus.

But `normRrf` has one clean failure, and it is the one this codebase already
documented: `make me a sandwich` scores **0.9692**, because the prefix term
`"make"*` matched 9 entries. `src/components/fts-query.ts`'s own header describes
the mechanism — *"a document matching a single common word enters the FTS ranking
at all — and if it is the only match, it enters at rank 1 and collects the full
RRF contribution."* The stopword list catches `do`/`we`/`use`; it does not catch
`make`.

And raw cosine's distributions genuinely overlap: `pytorch training loop`
(irrelevant, cos **0.6143**) and `how do I deploy to kubernetes` (irrelevant, cos
**0.6074**) both sit **above** `how does prune work` (relevant, cos **0.6072**).

## Decision

### 1. `importance` is removed from the ranking score

`score` becomes `normRrf`. `importance` does **not** survive as a tie-break —
that was proposed and rejected as a fiction: `semanticRank` and `ftsRank` are
assigned uniquely per row (`src/index.ts:481-483`), so `rrfScore` ties are
measure-zero, and the only real tie group is the zero-similarity tail
(`sr = fr = ∞ → rrfScore 0`), which never reaches top-k. There is no tie-break
job to give it.

This amends **ADR 0001**, which introduced the fused score.

### 2. `importance` is retained as a prune-only field

Once out of the score, `importance` has exactly one behavioural consumer:
`neuron memory prune`'s ceiling (`src/index.ts:870`). `scanner/ingest.ts:53`'s
`importance: 5` is also prune-shielding; `ui/html.ts:350` is display; the rest is
plumbing.

It is nonetheless kept, for reasons in descending force:

1. *"Should importance exist"* is strictly downstream of *"should prune exist"* —
   ticket `25`, **deferred by the maintainer 2026-08-01 with do-not-implement**.
   Removing importance here would reverse that deferral by the back door.
2. It is the only live guard against ticket `23`'s unfixed hazard (default
   importance 3 == default prune ceiling 3, compared inclusively). Pillar 10
   measures 9 of 12 entries deleting at the default; `--importance` alone saves
   the survivors.
3. **ADR 0010's 2026-08-02 amendment set the precedent** — ticket `26` kept the
   `enriched_at` column after killing the job that wrote it, because dropping a
   column makes an rc1/rc2 database non-downgradable.
4. It is inside the markdown content hash (`src/storage/mdVectorSync.ts:40`), so
   removal rehashes every entry and rewrites every `.md` file, mid-flight with
   ADR 0011's rc5 work — and pre-empts ticket `36`, which has not yet decided
   whether `importance` is a declared frontmatter field.

### 3. The gate is a conjunction of two legs

**Both required.** They fail on disjoint sets, so neither is redundant:

| leg | quantity | rejects | misses |
|---|---|---|---|
| **lexical** | `normRrf > 0.5` — a **predicate**, not a threshold | `ls`, `kubernetes`, `pytorch`, `France` | `make me a sandwich` (0.9692) |
| **cosine** | floor on raw similarity | `make me a sandwich` (0.4843) | `pytorch` (0.6143), `kubernetes` (0.6074) |

No cosine floor can reject `pytorch`/`kubernetes` without a false silence,
because they score above the lowest genuinely-relevant query. No lexical
predicate can reject `make me a sandwich`. The conjunction covers both.

The conjunction also makes the cosine floor tractable: unconditioned it must
separate relevant from all irrelevant (margin **0.064**); conditioned on the
lexical leg it need only separate relevant from irrelevant-with-a-stray-keyword
(margin **0.123**).

The lexical leg is a **topicality** test — does this query's vocabulary occur in
this store's domain at all. Relevance is the cosine leg's job.

### 4. Zero results is a legitimate output, and is announced with a count

`neuron exec` prints a terse stderr line naming the command and the number of
candidates rejected; `neuron memory query` carries an equivalent count in its
JSON so an empty `results: []` is distinguishable from an empty store.

Silence would conflate *"consulted the store and found nothing"* with *"did not
run"* — the conflation ADR 0011 Consequence 4 ruled on for frontmatter (*"a
missing field is a fact about the file, not a value to guess"*) and which the
markdown bootstrap seed exists to prevent. The count is also the diagnostic that
makes the gate tunable at the point of use.

### 5. The gate lives in the retrieval layer, on both paths

It applies to `neuron exec` **and** `neuron memory query`. A
gate-on-for-unsolicited / off-for-explicit split was proposed and declined: one
gate, one behaviour.

Placement is load-bearing. Ticket `11`'s injection ledger requires the floor to
sit beneath it, and the hook path calls the query layer rather than `neuron
exec`; a gate stranded in `src/commands/exec.ts` would have to be reimplemented
there, producing two thresholds over one retrieval — the hazard tickets `27` and
`39` were wired together to prevent.

### 6. Constants are separated from structure

Only the cosine floor is a fitted number, and it is measured on
non-self-referential data (ticket `39`, LongMemEval). Everything else — the
decontamination, the lexical predicate, the announcement, the relocation — is
justified structurally and ships without it (ticket `41`).

**No number in this ADR is a default.** All 15 supporting probes are against this
project's own store, which is denser on neuron's internals than any user's store
and was written by the same project whose prose is being retrieved. This is the
posture tickets `06`, `23` and `24` each reached by reversing a spec that had
asserted a measurement in advance.

## Consequences

1. **Query results reorder for existing users.** This is a ranking change, not
   only a filtering change: low-importance-but-relevant entries surface that
   previously did not. Requires a plain CHANGELOG statement.
2. **`neuron memory query`'s scores become meaningful for the first time.** The
   number shown to agents deciding whether to trust a result now reflects
   retrieval alone.
3. **Empty results become routine** where they were previously unreachable.
   `CLAUDE.md` step 1's *"If no results return, try a broader keyword"* becomes a
   live path.
4. **`minScore` is left untouched and remains inert.** Verified rather than
   assumed: within the top-5 window `normRrf` runs 0.5000 / 0.4919 / 0.4841 /
   0.4766 / 0.4692, all above 0.35. Deprecation was proposed on the precedent of
   `neuron learn`, `--scope` (ticket `38`) and `md-only`/`dual` (ADR 0011), and
   declined — no release ships before ticket `39`, so there is no published
   intermediate state to protect, and the config surface is settled once, with
   the number. **Reinterpreting `minScore` as the cosine floor is explicitly
   rejected**: a user carrying `0.35` would silently get a far weaker filter over
   a different quantity with no signal the meaning changed.
5. **`onExec` rule merging changes to last-match-wins.**
   `src/config/neuronYaml.ts:312-313` merges with `Math.max` on `limit` and
   `Math.min` on `minScore`, so every additional matching rule widens the result
   set and loosens the gate. A specific rule cannot currently tighten a general
   one, and adding a broad rule silently loosens every narrow one.
6. **The lexical leg's false-silence rate is unvalidated and can sink it.** Five
   on-topic paraphrases written to avoid the store's vocabulary all passed, since
   `cleanFtsQuery` emits OR'd prefix terms so ordinary words land hits — but that
   is a probe, not a result. Ticket `39` measures it on LongMemEval's paraphrased
   questions. If non-zero, the leg is wrong as a hard conjunct and must be
   demoted rather than tuned around.
7. **Confidently-wrong retrieval remains unowned.** Ticket `07` found raw cosine
   *inverted* there — top-1 cosine on wrong retrievals (mean 0.7779, max 0.9516)
   exceeds right ones (mean 0.7518, min 0.6548). This gate rejects the
   *irrelevant*, not the *wrong*, and nothing in this ADR addresses the latter.
8. **ADR 0010 §2 is corrected a second time.** Its 2026-08-02 amendment already
   withdrew the claim that a nonsense query's top hit scores ≥ 0.75. This ADR
   further establishes that its remaining characterisation of `minScore` as a
   weak filter understates the defect — it is not weak, it is structurally
   incapable of firing, and the repair is to the quantity rather than the
   threshold.
