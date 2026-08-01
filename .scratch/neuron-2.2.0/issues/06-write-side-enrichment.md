Type: task
Status: resolved
Blocked by: 05 (resolved)
Band: 2.2.0-rc2
Spec: [write-side-enrichment/spec.md](../../write-side-enrichment/spec.md) — `ready-for-agent`

# 06 — Write-Side Enrichment: Auto Tags, Importance, Category

## Question

Can the 0.5B model infer `--tags`, `--importance` and `--category` on
`neuron memory add` well enough to stop making the agent supply them by hand?

## Context

The `CLAUDE.md` protocol currently obliges the agent to write, every time:

```bash
neuron memory add --category learning "..." --tags failure-fix,<topic> --importance 4
```

That is three pieces of metadata the agent must get right on every write, and it
is a standing source of inconsistency — tags in the store today are agent-authored
free text, so near-synonyms accumulate and the FTS index fragments.

Tags and content are what `learnings_fts` indexes, so tag quality is retrieval
quality. This job is therefore not cosmetic: it is a recall-quality lever on the
write side, complementing ticket `07` on the read side.

## Design

Settled by a grilling session on 2026-08-01. **The spec is the authority**;
this section records only how the ticket's original scope changed.

The answer to the question above turned out to be "for one of the three fields,
and only if the model stays off the write path". Measured: the 0.5B model costs
**3205 ms to load per process** and the embedder costs **177 ms** — and the
embedder is *already loaded* when a memory is written. Since every CLI
invocation is its own process, a model load is amortised over exactly one
inference.

| Field | Mechanism | Cost on the write path |
|---|---|---|
| Tags | Centroid cosine over a closed vocabulary — **no model** | ~1 ms per tag |
| Category | Model, synchronous, only when `--category` is omitted | ~3.5 s (opt-in) |
| Importance | Model — free alongside category, else deferred | none |

Changes from the scope as originally written:

1. **Tags no longer use the model.** ADR 0010 §4 already forbade the model from
   minting a tag, which makes tagging a ranking problem, not a generation one.
   Tag vectors are the **centroid of the entries carrying that tag**, computed
   from embeddings already stored.
2. **The frequency floor is not a tuning knob.** A singleton tag's centroid is
   its own entry. Floor is ≥3 entries, plus every tag declared in `neuron.yaml`.
3. **Content-hash caching is dropped** (was deliverable 5) — inherited from the
   summarizer, whose hit rate depends on re-reading the same files. Memory
   content is authored fresh, so the hit rate approaches zero while the costs
   land on the interactive write path.
4. **`--category` becomes optional on `add` only**, inferred from the declared
   categories with **no default** — a hard error naming the cause when inference
   is unavailable, unless a literal fallback is configured.
5. **Importance is unclamped and measured, not constrained.** A floor at the
   default was considered and set aside in favour of a benchmark.
6. **New config namespace `llm.enrichment`**, carrying the per-job A/B toggle
   ADR 0010 §7 requires. `07` and `08` fill sibling sub-keys later.
7. **Deferred enrichment drains unbounded** on the next memory command whenever
   the backlog is non-empty, so any query sees fully enriched data. Requires an
   enrichment-timestamp column.
8. **Two category strategies ship and are A/B'd** — model-with-descriptions vs
   centroid cosine — because `learning` and `decisions` are semantically
   adjacent, which is where cosine is weakest and a prompt can use the
   `description` fields as instructions.
9. **New benchmark pillar** — *Importance Inference & Prune Safety*. Hard
   assertion: no known-critical entry may ever land in the delete set at the
   default prune threshold.
10. **The packaged skill gains an enrichment interview** covering both the config
    keys and the agent-instruction posture, with trade-offs.

## Deliverables

- [x] `llm.enrichment` config namespace, schema + validation
- [x] Centroid-cosine tag selection over the closed vocabulary
- [x] Category inference, both strategies, with the timeout and hard-error path
- [x] Importance inference — shipped unclamped, **then floored on the
      benchmark's own evidence** (see Answer)
- [x] Enrichment-timestamp column + unbounded backlog drain + explicit command
- [x] Timeout primitive and degradation counters on `neuron status`
- [x] Benchmark pillar: discrimination, stability, distribution, prune preview,
      category A/B
- [x] Non-regression A/B against enrichment-disabled on Pillar 7
- [x] `CLAUDE.md` flags shown optional; skill enrichment interview section
- [x] ADR 0010 amended — on five points, not three

## Comments

**2026-08-01 — grilling session.** Spec published at
[`.scratch/write-side-enrichment/spec.md`](../../write-side-enrichment/spec.md),
labelled `ready-for-agent`. Pruning redesign spun out to
[23 — Configurable Automatic Pruning](23-configurable-automatic-pruning.md); it
does **not** block this ticket, which owns its own enrichment trigger.

Surfaced but not this ticket's to fix: the default entry importance (`3`) and the
default prune threshold (`3`) are the same number and the prune is inclusive, so
every history entry written by the current protocol is prune-eligible after 30
days — today, with no model involved. This is the strongest argument for
scheduling `23` soon after this ticket.

## Answer

**Yes for tags. Conditionally for category. No, not yet, for importance.**

The ticket asked whether the 0.5B model can infer all three fields well enough
to stop making the agent supply them. The spec had already moved tags off the
model on latency grounds; the benchmark moved category off it too, and stood
importance down. **The shipped feature loads no model on the write path at all.**

### What shipped

| Field | Mechanism | Default | Write cost |
|---|---|---|---|
| Tags | Centroid cosine over the closed vocabulary | `infer` | ~1ms |
| Category | **Centroid cosine** over category centroids | `infer` | ~1ms |
| Importance | Model, floored at the default, via the backlog | **`off`** | none |

New: `llm.enrichment` config namespace; `enriched_at` column (migration v6) and
the unbounded backlog drain; `neuron memory enrich`; `withTimeout` (the timeout
primitive ADR 0010 §3 required and the codebase did not have); degradation
counters under `enrichment.*` in `neuron status`; a process-level singleton for
the Qwen model so a scan and enrichment in one process share one load; three new
benchmark pillars. `--category` is now optional on `add` only.

### What the benchmark changed, and why

The pillar was written before it was run, and it immediately failed. Three of its
findings overrode the spec:

**1. The category A/B inverted its own premise.** The spec expected the model to
win because it can read the `description` fields as *instructions* rather than
similarity targets. Measured over one corpus: **centroid 9/9, model 1/9**. Most
model answers were not a declared category at all. `categoryStrategy: centroid`
is the default. Its cost is a cold-store cliff — no entries means no centroids,
so an omitted `--category` on an empty store hard-errors until a few entries are
filed explicitly.

**2. Importance inference is a non-signal, so it ships off.** Asked to rate a
note about irreversible production data loss, the model answered `1`.
Discrimination between deliberately unambiguous critical and trivial entries
measured **-0.5** on one run and **+0.167** on the next; per-entry stability 0.5.
That is noise. The spec set clamping aside "in favour of measuring first" with an
explicit trigger to revisit — the benchmark pulled it. Inferred importance is now
floored at the entry default, so inference can raise importance but never lower
it, which makes it structurally incapable of increasing prune eligibility. The
machinery ships and works; `importance: off` is the default because recommending
a measured non-signal would be dishonest.

**3. The prompts had to become few-shot.** The first implementation followed the
spec's instruction-style prompt asking for `category: <name>` / `importance:
<digit>`. The model answered by *continuing the note*: 12 of 12 importance
inferences were unparseable, and the pillar's `degraded` counter was 12/12.
Worked examples fixed format compliance completely (degraded 1/12). This is worth
recording for tickets `07` and `08`: at 0.5B, few-shot is not a refinement, it is
the difference between parseable output and none. Also — a multi-field answer is
not reliably parseable, so category and importance are two generations against an
already-resident model rather than one call with two lines.

### The hard assertion had to be restated

The spec's pass/fail bar was "no known-critical entry may ever appear in the
delete set at the default prune threshold". **That assertion fails identically
with enrichment switched off**, and it always would have: default entry
importance is `3`, the default prune threshold is `3`, and the prune is
inclusive, so every entry written without an explicit `--importance` is
prune-eligible after thirty days. The baseline arm of Pillar 10 deletes all
twelve corpus entries including all six criticals. Verified directly with the
model entirely out of the picture.

An absolute bar would therefore have been a tripwire that can never go green and
that measures ticket `23`'s hazard rather than this ticket's inference. The
assertion is now **relative and gating**: enrichment may not add a single
critical entry to the delete set that was not already there without it. Plus a
floor assertion that inference never lowers importance below the default. The
absolute delete sets for both arms are still reported in full — the number is
worth having, it is just ticket `23`'s to act on.

### Results

- **252 unit tests green** (was 231); **14/14 E2E pillars green**.
- **Pillar 12 — non-regression (ADR 0010 §7's bar):** adversarial corpus with
  enrichment enabled vs disabled, differing only in whether the gold entries'
  tags were hand-authored or inferred. `recallAt1` 0.375, `recallAt5` 0.75,
  `mrr` 0.473 — **identical in both arms, delta 0.0 on all three**. Neutral
  passes. Inference recovered the correct topical tag on 3 of 8 golds and chose
  harmless ones on the rest.
- **Pillar 11 — category A/B:** centroid 1.00, model 0.11.
- **Pillar 10 — importance:** distribution across 1–5, prune previews for both
  arms, stability, and the gating comparison.

### Known gaps, deliberately left

- **A declared tag with zero entries is not selectable.** Declared tags are
  exempt from the frequency floor, but a centroid needs at least one entry to be
  the mean *of*. A freshly declared tag becomes selectable as soon as one entry
  uses it explicitly. Embedding the tag string instead was considered and
  rejected by the spec on the merits.
- **Tag vocabulary reads every tagged row's embedding** once per process. Fine
  at this store's size; it is a full-table read that will want an index or a
  cached centroid table long before it is a real problem.
- **md-only mode gets no tag inference** — centroids come from the vector store,
  which that mode does not have. Category inference by centroid is likewise
  unavailable there, so md-only users should keep passing `--category`.

## Comments

**2026-08-01 — implementation session.** Implemented from the spec, AFK. The spec
was followed except where the benchmark it mandated contradicted it; every such
override is recorded above and in the ADR 0010 amendment. `CONTEXT.md` gained
six glossary entries and the architectural blueprint was re-baselined
(`neuron scan --check` exits 0).
