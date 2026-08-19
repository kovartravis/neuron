---
title: "Hybrid Search & Reciprocal Rank Fusion"
description: "How neuron combines keyword and semantic search, and the reranker gate that filters what actually gets injected."
---

## Two search strategies, combined

Semantic vector search is strong at conceptual lookup but weak at exact
strings — an embedding-only search can miss a query for the literal text
`onnxruntime-node` or `npm test` because it's reasoning about meaning, not
characters. Neuron runs SQLite's FTS5 keyword search alongside semantic
search over BGE-small embeddings, so an exact-string match and a
conceptual match are both found, not just one.

## Reciprocal Rank Fusion

The two result lists are merged with Reciprocal Rank Fusion (RRF), a
rank-based aggregation with a dampening constant `k = 60`. RRF cares about
where a document ranks in each list, not its raw distance score, which is
what lets a keyword hit and a semantic hit combine fairly even though
they're scored on different scales. The RRF score is normalized against
its theoretical maximum and linearly combined with an entry's Importance
rating: `score = 0.75 × normalizedRRF + 0.25 × normalizedImportance`.

## A second gate before anything is injected

`score` alone doesn't separate a strong match from the best of a weak set
— a top-ranked result in both lists can score highly even when nothing in
the store is truly relevant. A local ONNX cross-encoder reranker
(`Xenova/ms-marco-MiniLM-L-6-v2`, no remote API call) second-gates every
candidate that clears the lexical leg before it's ever injected. Calibrated
against the real LongMemEval-S benchmark split, this cut the false-accept
rate on the hardest out-of-corpus negatives from 99.80% to 19.4%, trading
a roughly symmetric 19.8% false-silence rate for that reduction.

Source: [`CHANGELOG.md`, 2.4.0](https://github.com/kovartravis/neuron/blob/main/CHANGELOG.md), [ADR 0001 — Hybrid Search RRF](https://github.com/kovartravis/neuron/blob/main/docs/adr/0001-hybrid-search-rrf.md).
