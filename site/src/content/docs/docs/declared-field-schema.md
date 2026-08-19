---
title: "Declared Field Schema: Enforcing Required Frontmatter"
description: "The three field tiers behind neuron's schema guarantee, and exactly what 'deterministic' does and doesn't promise."
---

## Three field tiers

Every entry carries fields from up to three tiers. **Structural** fields
(`id`, `createdAt`) are never optional — the system can't function without
them. **Semantic reserved** fields (`importance`, `tags`, `taskId`) are
fields neuron itself reads for behavior — `prune` reads `importance`, for
example. **User-defined** fields (`ticket`, `reviewedBy`, or anything else
a project declares in `neuron.yaml`) are opaque to neuron, preserved
on round-trip, and validated on write — this is the tier that carries a
project's actual schema, letting a team say "every `decisions` entry must
carry a `ticket` and a `reviewedBy`, and the CLI refuses writes without
them."

## What "deterministic" actually promises

The word bundles three separable properties, and neuron's default claim
covers two of them, not all three. **Shape determinism** — every entry
conforms to the declared schema — is guaranteed always. **Byte
determinism** — stable serialization, no gratuitous diff noise — is also
guaranteed always. **Value determinism** — the same command produces the
same field values every time — is *not* guaranteed by default, because
centroid-based tag and category inference selects against a growing store,
so the same `neuron memory add` a month later can select different values
for an unset field. An opt-in `strict` config flag disables both tag and
category inference, trading that convenience for full value determinism.

## String, enum, and commitRef — no general escape hatch

Declared fields support three types: `string`, `enum`, and `commitRef`.
There's still no number or date type — `importance`'s hardcoded 1–5 integer
range is a semantic-reserved field, not something declared this way — and
no pluggable custom-code verifier. `commitRef` is the one narrow addition
to the original string/enum-only floor: its value must resolve to a real
commit in the project's own git history (full or abbreviated SHA), checked
at write time via a `git` shell-out at the same enforcement choke point
every other field goes through. Enum values reuse neuron's typo suggester,
so a near-miss value gets a correction suggestion rather than a bare
rejection.

## Required-but-missing is one policy, everywhere

A required field with no value hard-errors, naming the field and category,
unless the category config declares a literal `default:`, in which case
the CLI fills it silently. This is the same policy whether the write comes
from the interactive CLI or from `neuron scan`'s direct write path —
enforcement lives in `transact()`, the one choke point every writer shares,
so there's no second validation path to drift out of sync.

## Pre-existing entries aren't retroactively broken

Declaring a new required field doesn't invalidate entries written before
the rule existed. Reads never hard-error on old data — the hard-error
policy only bites new create/update writes. Non-compliant existing entries
surface through `neuron status --check` instead, so a schema change is
visible without turning into a landmine across an entire category file.

Source: [ADR 0013 — Configurable Frontmatter Schema](https://github.com/kovartravis/neuron/blob/main/docs/adr/0013-configurable-frontmatter-schema.md), including its [`commitRef` amendment](https://github.com/kovartravis/neuron/blob/main/docs/adr/0013-configurable-frontmatter-schema.md#2026-08-15--commitref-one-narrow-addition-to-the-type-floor).
