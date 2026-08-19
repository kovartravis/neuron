---
title: "Storage Adapters: Markdown or SQLite, Same Guarantee"
description: "How neuron's md and vector storage modes work internally, and why markdown is the record of truth rather than a mirror of one."
---

## Markdown is the record, SQLite is a rebuildable index

In `md` mode (the default), markdown is written first, and the SQLite
write only happens once that succeeds — so markdown is never behind the
index, and an entry absent from markdown gets deleted from the index on
the next reconcile, with no tripwire or `--force` needed. `.neuron/` is
tracked in git rather than gitignored, so git is the recovery mechanism
for markdown, the same as it is for source files — one recovery story, not
two. Retrieval parity between `md` and `vector` mode is achieved by
construction: both use the same hybrid RRF code path described in
[hybrid search & RRF ranking](/docs/hybrid-search/), so there's no
retrieval caveat owed to one mode over the other.

## Staleness detection is cheap

Every command checks each entry's content hash against what's indexed.
Detection across a whole store costs 0.006 ms; repairing one edited entry
costs 2.39 ms, against roughly 630 ms to re-embed its entire category —
which is why neuron hashes per entry rather than per category.

## Per-category path and mode overrides

A category isn't locked to the project-wide storage path or mode. Setting
`path` or `storage` directly on a category in `neuron.yaml` sends just
that category elsewhere — a shared notes directory, or a high-volume
category routed straight to `vector` storage while the rest stays in
reviewable markdown. See [configuration](/docs/configuration/) for the
full syntax. Internally, `MultiRootMdStorage` fans a single
`MdStorageAdapter` implementation out across every root a category's path
resolves to; two categories sharing a root share one adapter instance,
so the path-containment and sanitization logic isn't duplicated per
category.

## Switching a category's mode is safe in both directions

When a category is reconciled into `md` mode for the first time on a store
that already holds real `vector` rows for it, neuron reseeds markdown from
the vector store rather than treating the (empty) markdown file as
authoritative and deleting those rows — the same reseed path a changed
storage root already uses. Going the other direction — a category flipping
from `md` back to `vector` on a store with real markdown already on disk —
deletes nothing either; the category simply drops out of the reconciled
set, and neuron warns once, naming the category and file, rather than
silently letting that markdown file go stale.

Source: [ADR 0011 — Markdown as the Store of Record](https://github.com/kovartravis/neuron/blob/main/docs/adr/0011-markdown-as-store-of-record.md), [ADR 0016 — Per-Category Storage Vocabulary](https://github.com/kovartravis/neuron/blob/main/docs/adr/0016-per-category-storage-vocabulary.md).
