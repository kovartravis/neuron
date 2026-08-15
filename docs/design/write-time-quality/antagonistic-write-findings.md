# Antagonistic-write findings — diagnostic for Map — neuron 2.4.1

**Date:** 2026-08-15
**Ticket:** 1 — Antagonistic-Write Test Pillar (Diagnostic), child of
Map — neuron 2.4.1 ("write-time quality")
**Test:** `test/e2e/antagonistic-write.test.ts`, Pillar 14: Antagonistic
Write & Quality Gate (Diagnostic)

---

## TL;DR

Ran the five candidate "bad write" cases the map scoped, against the real
write gate (the CLI's `memory add` supersession check plus `transact()`'s
`enforceFieldSchema`). Case 4 is excluded — no objective test criterion
exists yet. Results:

| # | Case | Expected (per map) | Measured today |
|---|------|---------------------|-----------------|
| 1 | Near-duplicate content (paraphrase) | Passes uncaught | **Confirmed uncaught** |
| 2 | Direct contradiction, no `--supersedes` | Passes uncaught | **Confirmed uncaught** |
| 3 | Missing provenance on a category that should require it | Maybe already solved — check first | **Confirmed uncaught — not solved** |
| 4 | Vague/low-specificity content | Not testable, no criterion | Excluded, unchanged |
| 5 | Existing shape violations (missing required field, bad enum) | Should already fail | **Confirmed caught**, both sub-cases |

None of the map's own expectations were overturned, but two things sharpen
its scoping that weren't obvious before running this:

1. **The write path actually has two independent gates, not one**, and they
   sit at different layers. This matters for tickets 3-4's implementation,
   not just this diagnostic (see §3).
2. **Ticket 2 is not documentation-only.** The map's sequencing rationale
   flagged this as a possible free win ("if a category is already configured
   with a required `sourceRef`-style field, the enforcement already
   exists"). It doesn't: this repo's own `decisions` category declares no
   `fields:` block at all in `neuron.yaml`, so there is nothing for
   `enforceFieldSchema` to check. Ticket 2 is real engineering (or at
   minimum a real config change plus validation that an omitted-field write
   is rejected with a clear error) — see §2.3.

---

## 1. Method

Two different gates are in play, tested at the layer where each actually
lives — calling `NeuronMemory.transact()` directly would have silently
skipped the first one entirely:

- **The write-time supersession/similarity gate** lives in the CLI's
  `memory add` handler (`src/commands/memory.ts`, the block guarded by
  `options.supersedes` / `options.notAReversal` / `options.ifNovel`), ahead
  of `transact()`. It shortlists the closest existing entry by raw embedding
  cosine (`findSupersessionCandidate`, `src/index.ts`) and hard-errors above
  `SUPERSESSION_SIMILARITY_THRESHOLD = 0.97` unless the caller resolves it.
  Cases 1 & 2 spawn the real CLI (`dist/cli.js`) with the real, non-mocked
  embedder — the mock embedder returns a fixed all-zero vector regardless of
  content, so it cannot produce a meaningful similarity score and would have
  made this gate look like it always passes (a false negative for the whole
  measurement, not a true one).
- **The declared-field schema gate** (`enforceFieldSchema`) lives inside
  `transact()` itself and needs no embedder at all. Cases 3 & 5 call
  `NeuronMemory.transact()` directly against a purpose-built `neuron.yaml`
  that mirrors this repo's own real category shapes (`decisions` with no
  `fields:` block; `tickets` with a required, enum-typed `kind`), matching
  `src/fieldSchema.test.ts`'s own harness.

Case 4 (vague/low-specificity content) is absent from the pillar entirely,
per the map's own "Not yet specified": there is no objective pass/fail
criterion to assert against yet.

## 2. Findings, per case

### 2.1 Case 1 — near-duplicate paraphrase

Seeded `"The default request timeout is 30 seconds."`, then wrote
`"By default, requests time out after 30 seconds."` via the CLI with no
`--supersedes`/`--not-a-reversal`. **Accepted, exit 0, no warning.**

The supersession gate's threshold (0.97 cosine) is tuned for near-exact
rewording or a true reversal, not general semantic paraphrase — this pair
sits below it. Confirms the map's expectation: no near-duplicate detection
exists today, independent of the exact-hash question below.

### 2.2 Case 2 — direct contradiction, no `--supersedes`

Seeded `"Query results are limited to 10 items by default."`, then wrote
`"Query results are limited to 25 items by default."` via the CLI with no
`--supersedes`/`--not-a-reversal`. **Accepted, exit 0, no warning.**

Same mechanism and same threshold as case 1 — a same-shape numeric
contradiction doesn't cross 0.97 either. Worth carrying into ticket 4's
design: the supersession gate cannot currently distinguish "these are the
same idea, reworded" from "these directly disagree" even when it *does*
fire, because it only measures embedding proximity, not the polarity of
what changed. Ticket 4 (conflict detection) is not "raise this gate's
threshold" — a lower threshold would catch both near-dups and conflicts
without telling them apart, which is a worse UX than catching neither.

### 2.3 Case 3 — missing provenance on `decisions`

Wrote `"We chose SQLite for local storage."` to a `decisions` category
declaring no `fields:` block (mirroring this repo's real `neuron.yaml`).
**Accepted, no error.**

`enforceFieldSchema` only ever looks at `this.config.categories[category]?.fields
?? {}` — an empty object when the category declares no `fields:` block, so
there is nothing to enforce. This directly answers the map's own open
question ("may already be solved — check this first"): it is not solved.
Ticket 2's real content, once scoped, is likely: (a) actually adding a
required `source`/`ticket`-style field to categories that want provenance —
a config change any project can already make today, no engineering
required, matching this repo's own `decisions.fields.ticket: required` in
`fieldSchema.test.ts`'s fixture — and (b) whatever engineering work follows
from making that the *documented, recommended* posture rather than an
opt-in a project has to discover on its own (e.g., `neuron init` scaffolding
a `sourceRef`-shaped field by default for categories intended to hold
decisions/claims). Scoping which of these ticket 2 actually needs is
squarely ticket 2's job, not this diagnostic's — but "no code path exists"
is now ruled out.

### 2.4 Case 5 — shape violations (regression re-assertion)

Two sub-cases against a `tickets`-shaped category with required, enum-typed
`kind`:

- Missing required field (`kind` omitted): **rejected**, `Error: --kind is
  required for category "tickets"...`.
- Undeclared enum value (`kind: "bogus-kind"`): **rejected**, `Error:
  --kind "bogus-kind" is not one of [research, prototype, grilling, task]`.

Both already covered at unit level by `src/fieldSchema.test.ts`; re-asserted
here only so the whole "bad write" story — caught and uncaught alike — lives
in one place, per the ticket's own deliverable.

## 3. Implication for tickets 3 & 4's scoping

Because near-dup and conflict detection would both want to reuse "how
similar is this new content to a live entry" (per the map's own "Not yet
specified" — whether tickets 3 & 4 share one embedding-comparison code
path), it's worth naming precisely how what already exists differs from
what's proposed:

- The **existing** supersession gate is *interactive and binary*: above
  0.97 cosine, hard-stop and demand a human resolve it
  (`--supersedes`/`--not-a-reversal`/`--if-novel`). It has no notion of
  "duplicate vs. conflicting" — just "suspiciously similar."
  It also only compares against the single closest match, not every
  similar entry.
- **Ticket 3** (near-dup suppression) and **ticket 4** (conflict detection)
  both need a materially lower similarity band than 0.97 to catch cases 1
  and 2 above, which means both will fire far more often than the existing
  gate — and, per case 2's finding, need something beyond cosine similarity
  alone to tell "restates" from "disagrees with" once they do. That
  distinction (and whether it's worth a coined term) is real
  `/domain-modeling` work the map's own Notes already anticipated for
  ticket 4.

## 4. What this does *not* answer

- Case 4 (vague content) — no criterion yet, unchanged from before this
  ticket ran.
- Whether tickets 3 and 4 end up sharing one embedding-comparison code path
  — still open, now with a concrete reason (§3) rather than a guess.
- What the "conflict, not duplicate" distinguishing signal should be for
  ticket 4 — flagged, not designed, here.
