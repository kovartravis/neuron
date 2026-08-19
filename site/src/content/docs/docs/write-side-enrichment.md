---
title: "Write-Side Enrichment: Automatic Tags and Category"
description: "How neuron fills in tags and category on memory add — centroid cosine matching against a closed vocabulary, never free-form model generation."
---

## What it fills in

Write-side enrichment fills in the metadata a caller didn't supply on
`neuron memory add` — tags and category. It fills only unset fields;
anything passed explicitly (`--tags`, `--category`) is honored untouched
and never overridden. It hangs off `NeuronMemory.transact`, the single
seam every write in neuron routes through, so enrichment applies uniformly
whether the write came from the CLI or from `neuron scan`.

## Centroid matching, not free-form generation

Tags are selected by centroid cosine similarity against a closed
vocabulary — every tag declared in `neuron.yaml`, plus every store tag
already carried by at least three entries — with no model call involved. A
tag's centroid is the normalized mean embedding of the entries that
already carry it; selecting a tag is really "which existing cluster does
this new entry's content resemble." Category is inferred the same way, by
default, against the store's own category centroids. A live A/B test
measured this centroid approach against a model-based alternative that
could read each category's `description` field as an instruction: centroid
won 9 of 9 corpus questions, the model 1 of 9 — most of the model's answers
weren't even a declared category. Centroid is the default for both,
because of that result and because it removes the last model call from the
write path.

## The model cannot mint a tag

Both tags and category are drawn from a closed, declared set — the model
(when a `categoryStrategy: model` opt-in is configured) cannot invent a
new tag or category from embedding proximity alone. Minting a new tag
stays a human act, which keeps a store's tag vocabulary from fragmenting
into one-off near-synonyms.

## Importance is never inferred

Importance was a third enrichment target through two earlier release
candidates. A benchmark measured the shipped 0.5B model's discrimination
between deliberately unambiguous critical and trivial entries at -0.5 and
+0.167 across two runs — noise, not signal — including at least one case
where the model rated a note about irreversible production data loss as
importance `1`. That inference path was removed outright rather than kept
as a disabled default. An omitted `--importance` takes the column default
of `3`.

Source: [`CONTEXT.md` "write-side enrichment"](https://github.com/kovartravis/neuron/blob/main/CONTEXT.md), [ADR 0010 — Guardrails for the 0.5B Model's New Jobs](https://github.com/kovartravis/neuron/blob/main/docs/adr/0010-llm-job-guardrails.md).
