# Category: tickets-present

---
id: 62a35315-8f42-48d9-844f-fb0376e494d0
createdAt: 2026-08-19T19:13:39.908Z
importance: 4
tags:
  - architecture
  - scan
  - nli
  - memory
taskId: null
kind: map
status: unclaimed
---
# Map — Architecture Scan: Decision-Contradiction Detection

## Destination

`neuron scan` gains a decision-contradiction check: when a scan detects a
structural change (a new or changed dependency edge, a new or removed
module), it semantically cross-checks the change against the project's own
recorded `decisions`/`architecture` memory entries — using the same local
embedder + NLI cross-encoder infrastructure already calibrated for
write-time conflict detection (`src/components/nliClassifier.ts`) — and
surfaces, advisory-only and never CI-blocking, any change that plausibly
contradicts something already decided. Reached when this ships as a real
`neuron scan` capability with its own validated precision posture, not one
assumed from the memory-write gate's numbers.

## Notes

- **Chartered 2026-08-19**, graduated from the fog item flagged when Map —
  neuron.github.io Site (2.5.0) archived ("a future map to deepen
  Architecture Scan as a product feature... belongs to a separate
  chartering session").
- **Settled at chartering, breadth-first grilling before any tickets**:
  - **"Deepen" means the product feature, not documentation.** Docs (a
    "How It Works" page, the SEO/GEO "architecture linter" positioning
    angle) are deliberately deferred — see Out of scope.
  - **The AI-native angle, not commodity static analysis.** Pure
    graph-based rules (forbidden-dependency declarations, circular-dep
    detection, fan-in/out budgets) were considered and explicitly ruled
    out — they're checkable by `dependency-cruiser`/`madge` today, need no
    model, and don't differentiate neuron from tools that already do this.
    The chosen direction is the one thing only neuron can do: it already
    has both a codebase scanner *and* a semantic memory store with a
    calibrated contradiction-detection model — nothing else in the
    competitive landscape combines those two.
  - **This map carries execution**, per the wayfinder skill's own override
    clause — the destination is a shipped capability, not a spec.
- **Reuse, but re-validate, don't assume.** `src/components/nliClassifier.ts`
  (`cross-encoder/nli-MiniLM2-L6-H768`) is the shipped write-time conflict
  gate for `neuron memory add`, from neuron-2.4.2's own tickets 4/8/9/11/13
  (archived to `tickets-past`) — but its calibration is against short
  memory-entry pairs, not ADR-style decision/architecture prose or
  scan-diff change descriptions. That prior work found a real, measured
  precision ceiling (27-40% false-accept on compatible-but-related pairs
  depending on threshold, an SNLI/MultiNLI training-bias artifact) which
  is *why* that gate is soft-flag, never hard-block — this map's own
  posture must not be more confident than that precedent without its own
  fresh A/B evidence. See
  `docs/design/write-time-quality/nli-polarity-detection-ab-findings.md`
  and neuron-2.4.2's tickets 8/11/13 for the methodology to mirror.
- **Skills to consult**: `/grilling` for the CLI-surface and
  persistence-vs-ephemeral decisions still in fog below, once the
  validation ticket's findings are in.

## Decisions so far

## Not yet specified

- **Exact CLI surface** — a new `neuron scan` flag, or folded into
  `--diff`'s existing human-readable output. Depends on the validation
  ticket's precision findings: a noisy signal reads very differently as a
  dedicated `--check-decisions` flag (implies a considered feature) than
  as a line in `--diff`'s existing output (implies "fyi, unverified").
- **Persistence** — whether a flagged contradiction gets written back to
  memory as its own entry (so later scans/agents see it without re-running
  the check) or stays purely ephemeral CLI/JSON output. Depends on the
  same validation findings and on whether a noisy signal is worth
  persisting at all.

## Out of scope

- **Graph-based rule declarations** (forbidden-dependency rules,
  circular-dependency detection, fan-in/out coupling budgets) — ruled out
  at chartering: commodity static analysis, no model involvement needed,
  doesn't differentiate neuron from `dependency-cruiser`/`madge`. A future
  map could revisit this as its own effort if ever wanted.
- **Broader Tree-Sitter grammar coverage** (C#, Swift, Ruby, PHP still
  fall back to a line-oriented scanner) — a different kind of "deepen,"
  not this map's chartered destination.
- **The "How It Works" docs page and SEO/GEO "architecture linter"
  positioning** — deliberately deferred until this feature is real;
  belongs to a future docs-site effort, not this one.

---
id: e09497d1-8326-4a3b-9f3f-75dcfdef32de
createdAt: 2026-08-19T19:13:54.846Z
importance: 4
tags:
  - architecture
  - scan
  - nli
taskId: null
kind: task
map: 62a35315-8f42-48d9-844f-fb0376e494d0
status: unclaimed
---
# 1 — Validate NLI Polarity Detection on Architecture-Decision Text (A/B)

## Question

Does `cross-encoder/nli-MiniLM2-L6-H768` (the model already shipped in `src/components/nliClassifier.ts` for write-time memory conflict detection) reliably separate "contradicts" from "compatible-but-related" on the kind of text this map's decision-contradiction check will actually run against — `decisions`/`architecture` category entries as the premise, and a natural-language description of a scan-detected structural change (e.g. "module `scanner` now imports module `commands`") as the hypothesis? What confidence bar, if any, gives an acceptable false-accept rate for an advisory (never CI-blocking) signal?

## Context

neuron-2.4.2's own Ticket 8 (now archived to `tickets-past`, id `b8900ad0-0579-4263-98f5-6f8acee75025`) validated this exact model against short memory-entry pairs and found a real, measured precision ceiling: 27-40% false-accept on compatible-but-related pairs depending on threshold, an SNLI/MultiNLI training-bias artifact, not a tuning miss — which is why that gate shipped soft-flag-only, never hard-block. This ticket's job is to find out whether that same ceiling holds, is worse, or is better on this map's different kind of text (longer ADR-style decision prose vs. short memory entries; a synthesized change description vs. a natural write). Do not assume Ticket 8's threshold transfers — measure it fresh, mirroring Ticket 8's methodology (`benchmarks/nli-polarity-ab/run-ab.ts` as the harness template, a fresh corpus of real/synthesized premise-hypothesis pairs drawn from this repo's own `decisions`/`architecture` entries and real scan-diff output, not the original SNLI/MultiNLI-derived corpus).

Unblocked — first ticket on this map. Its verdict (usable bar vs. no usable bar at any threshold) gates every downstream ticket: the CLI-surface and persistence questions in the map's "Not yet specified" fog can't be answered until this ticket says whether the signal is trustworthy enough to expose at all.
