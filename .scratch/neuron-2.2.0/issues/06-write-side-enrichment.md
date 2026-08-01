Type: task
Status: claimed
Blocked by: 05 (resolved)
Band: 2.2.0-rc2

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

## Scope

1. Infer `tags`, `importance` and `category` from the entry content at add time.
2. Honour the guardrails settled in ticket `05` — particularly the override
   semantics when the agent passes flags explicitly, and the fallback when the
   model is unavailable.
3. Constrain the tag vocabulary against tags already in the store rather than
   generating freely, so enrichment converges the vocabulary instead of widening
   it. (Confirm against `05`'s ruling.)
4. Category inference must respect the categories declared in `neuron.yaml`
   (`learning`, `history`, `decisions` here) — never invent one.
5. Cache by content hash, matching the summarizer's existing pattern.
6. Keep the write path usable when the model is cold: a first `memory add` after
   install must not block on a model load.

## Verification

- Enriched entries must be retrievable by their inferred tags — a tag the model
  invents that nobody would ever search is a failure, not a success.
- Compare recall on a fixed query set before and after enrichment on a real store.
  The bar from `05` is "must not make recall worse".

## Deliverables

- [ ] Enrichment pipeline wired into `neuron memory add`
- [ ] Override semantics per ticket `05`
- [ ] Vocabulary constraint against existing store tags
- [ ] Content-hash caching
- [ ] Before/after recall comparison on a fixed query set
- [ ] `CLAUDE.md` / skill docs updated to show the flags are now optional
