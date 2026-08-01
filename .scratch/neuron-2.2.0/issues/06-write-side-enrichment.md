Type: task
Status: claimed
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

- [ ] `llm.enrichment` config namespace, schema + validation
- [ ] Centroid-cosine tag selection over the closed vocabulary
- [ ] Category inference, both strategies, with the timeout and hard-error path
- [ ] Importance inference, unclamped
- [ ] Enrichment-timestamp column + unbounded backlog drain + explicit command
- [ ] Timeout primitive and degradation counters on `neuron status`
- [ ] Benchmark pillar: discrimination, stability, distribution, prune preview,
      category A/B
- [ ] Non-regression A/B against enrichment-disabled on Pillar 7
- [ ] `CLAUDE.md` flags shown optional; skill enrichment interview section
- [ ] ADR 0010 amended on the three points the spec records

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
