# 10. Guardrails for the 0.5B Model's New Jobs

Date: 2026-08-01

## Status

**Accepted** (2.2.0-rc2). Governs tickets `06`, `07` and `08`.

## Context

Through 2.1.0 the shipped `Xenova/Qwen1.5-0.5B-Chat` had exactly one job: code
summarization during `neuron scan`. That job is forgiving — batch, occasional,
content-hash cached, and a mediocre summary is cosmetic.

2.2.0-rc2 proposes three more: write-side enrichment on every `memory add`,
query expansion in front of recall, and consolidation dedupe. None inherits the
summarizer's forgiving shape, and each fails differently. Shipping them without
first deciding their failure budgets means discovering those budgets in
production.

Two pieces of evidence framed every decision below.

**Retrieval is not the weak link.** The PersonaMem sanity run recorded retrieval
as 100% successful with 28k tokens retrieved; the failures were the *large*
answering model over-reasoning on that context. So these jobs are held to a
"must not make recall worse" bar, not a "might make it better" one.

**The store's tag vocabulary is already fragmented.** This repository's own
store: 224 entries, 191 distinct tags, **98 of them used exactly once**. Human
and agent tagging alone produced 51% singletons.

## Decisions

### 1. Query expansion is salvage, not preprocessing

Expansion does **not** run in front of every recall. Retrieval runs first on the
raw query; expansion fires and retries only when the result set is empty or the
best match is too weak.

Front-line expansion would tax every turn — and after rc3, every agent turn —
with model latency, in exchange for improving a retrieval step that is already
performing. Salvage pays the cost only where the cheap path has already failed,
which is the only place the cost can be justified.

### 2. "Weak" is measured by raw cosine similarity, not by `score`

The `score` returned by `query()` is `0.75·normRrf + 0.25·normImp`. RRF is
**rank-based**: a document ranked #1 in both the semantic and FTS lists scores
`normRrf = 1.0` no matter how distant it actually is, so the top hit of a
nonsense query still scores ≥ 0.75. `score` cannot separate "good match" from
"best of a bad set", and the existing `minScore: 0.35` default is a far weaker
filter than it appears.

The trigger therefore uses the raw cosine `similarity` already computed in
`src/index.ts` and currently discarded before results are returned. Surfacing it
is a prerequisite for ticket `07`.

**The floor is calibrated against Pillar 2's corpus, not guessed.**

### 3. Failure is silent, bounded, and observable

Each job degrades to today's behaviour rather than failing loudly — matching
`summarizeFile`'s existing fall-through. Three additions:

- **A timeout.** No timeout primitive exists in the codebase today; the only
  `timeout` is SQLite's `busy_timeout`. A hung `generate()` currently hangs its
  caller forever. Every model call gets a bounded wait.
- **Degradation counters** surfaced by `neuron status`.
- Nothing new printed on the interactive path.

Silence without counters is how a broken 0.5B model goes unnoticed for months.

### 4. Auto-tagging draws from a closed vocabulary

The model selects from `neuron.yaml`'s declared `categories.*.tags` plus store
tags above a frequency floor. Tags outside that set are dropped; **the model
cannot mint a tag.**

Free generation would accelerate the 51%-singleton problem, and near-synonyms
(`tree-sitter` / `treesitter` / `ast`) each become new FTS tokens that fragment
keyword recall. Minting a tag stays a human act. This also gives the declared
category vocabulary — currently written in config and read by nothing — a job.

### 5. Explicit input wins per-field

Enrichment fills only fields the caller left unset. An explicitly passed
`--tags`, `--importance` or `--category` is never modified.

Agents following the `CLAUDE.md` protocol always pass `--tags`, so per-field
precedence keeps their intent intact while ad-hoc adds still benefit.

### 6. Dedupe detects and selects; it never writes

The model's role in consolidation is **detection and selection only**: identify
duplicate groups and pick the best *existing* entry. No generated content enters
the store, so the worst case is a wrong survivor rather than an invented memory.

Non-selected duplicates are **marked superseded, not deleted**. They remain as
rows, excluded from recall by default, so a wrong pick is a flag flip to undo
rather than permanent loss of wording the survivor may lack.

Note that `maintain({ consolidate: true })` is **read-only today** — it reads
history rows past a watermark and returns them. This decision introduces
destructiveness that does not currently exist, which is why it is bounded to a
reversible flag and a schema addition rather than deletion.

### 7. Strict non-regression, A/B against job-disabled

Each job ships only if the relevant E2E pillar is **no worse** with it enabled
than disabled. Neutral is a pass; worse is a block.

| Job | Pillar | Metrics |
|---|---|---|
| `06` enrichment | Pillar 7 — Adversarial Retrieval Quality | `recallAt1`, `recallAt5`, `mrr` |
| `07` salvage expansion | Pillar 2 — Adversarial Semantic Recall | recall on weak queries |
| `08` dedupe | Pillar 7 | existing `supersededViolations` |

This requires a per-job disable toggle so both arms can run; `SummarizerOptions.forceFallback` is the existing pattern.

The model is disabled under `NODE_ENV=test`, so the E2E suite is the only place
these jobs can be measured at all.

## Consequences

New work these decisions create, none of which exists today:

- Surfacing `similarity` on query results
- A timeout primitive
- Degradation counters on `neuron status`
- A controlled-vocabulary resolver over `neuron.yaml` plus store tag frequency
- A `superseded_by` column and a read-path filter — **a schema migration**
- A per-job disable toggle for A/B measurement
- Calibration of the cosine floor against a real corpus

**Ticket `07` changes shape entirely.** It is no longer "query expansion"; it is
"salvage expansion on weak retrieval", with a different trigger, a different cost
profile, and a prerequisite in `src/index.ts`.

**These are parity features, not differentiators.** Automatic memory extraction
is Mem0's headline feature; temporal supersession is Zep/Graphiti's. Both do it
with frontier models. A 0.5B local model will not win that comparison, which is
exactly why the bar here is non-regression rather than improvement.

## Amendments

### 2026-08-01 — after implementing ticket `06`

Five decisions above were written before the jobs were built and measured. They
are amended, not withdrawn; the reasoning that produced them still holds, but
implementation and Pillars 10-12 changed what follows from it.

**§4 no longer describes tag selection.** The model does not select tags. §4's
own constraint — that the model may not mint a tag — makes tagging a *ranking*
problem over a closed set, not a generation one, and ranking is what the
embedder already on the write path does for about a millisecond per tag. Tags
are now the centroid of the entries carrying them, and selection is top-K cosine
against the entry's embedding. The model is off the tagging path entirely.

**§4's frequency floor is a property of the method, not a threshold.** A tag
carried by one entry has a centroid identical to that entry, so selecting it is
"most similar entry" wearing a label. The floor is three entries, plus every tag
declared in `neuron.yaml` regardless of frequency. It is not a tuning knob.

**§5's per-field precedence now has one conditional field.** Category is
*conditionally required*: optional on `add`, still mandatory on `delete` and
`update`, and hard-failing when inference cannot produce a declared category and
no literal fallback is configured. It is a non-nullable column that determines
storage routing, so unlike tags and importance it cannot be deferred and cannot
be left unset. Explicit input still wins for all three.

**The category strategy A/B is settled: centroid, not the model.** §7 required
the choice be made on evidence. Pillar 11 ran both strategies over one corpus:
centroid 9/9, model 1/9. The premise that the model would win because it can
read the `description` fields as instructions did not survive contact with a 0.5B
model — most of its answers were not a declared category at all. Centroid is the
default, and it also removes the last model call from the write path. Its cost is
a cold-store cliff: no entries means no centroids, so an omitted `--category` on
an empty store hard-errors until the first entries are filed explicitly.

**Inferred importance is floored, and ships off by default.** §5 implied
unconstrained inference, and ticket `06` deliberately shipped importance
unclamped in order to measure it, with the stated trigger for revisiting: the
benchmark showing the model marking critical entries prune-eligible. Pillar 10
showed exactly that — asked to rate a note about irreversible production data
loss, the model answered `1`. Two consecutive runs measured its discrimination
between deliberately unambiguous critical and trivial entries at **-0.5 and
+0.167**, which is noise, and per-entry stability at 0.5. Two changes follow:

1. Inferred importance is floored at the entry default, so inference can raise
   an entry's importance but never lower it. Enrichment is therefore incapable
   of increasing prune eligibility, which is the destructive direction.
2. `llm.enrichment.importance` defaults to `off`. The machinery ships and works;
   recommending it as a default would be recommending a measured non-signal.
   Revisit with a larger model.

**§7's non-regression bar was met.** Pillar 12 ran the adversarial corpus with
enrichment enabled and disabled, differing only in whether the gold entries'
tags were hand-authored or inferred: `recallAt1`, `recallAt5` and `mrr` were
identical in both arms (delta 0.0 on all three). Neutral is a pass.

One thing this work did **not** fix, recorded because Pillar 10 quantified it:
the default entry importance and the default prune threshold are both `3` and
the prune is inclusive, so at the default threshold every entry written without
an explicit `--importance` is prune-eligible after thirty days. This is true with
enrichment switched off — the baseline arm of Pillar 10 deletes all twelve
corpus entries including all six known-critical ones. It is owned by ticket `23`.

## Related

- ADR 0004 — the lightweight local LLM summarizer
- ADR 0007 — the E2E benchmark pillars these bars are measured on
