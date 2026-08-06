Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc5

# 45 — `strict` Mode and Updated `neuron-memory` Skill Docs

## Question

Ship a `strict` config flag (opt-in, per-project in `neuron.yaml`) that
disables both tag inference (`llm.enrichment.tags`) and category inference
(`llm.enrichment.categoryStrategy`) from `06`, so a project that forgoes
inference's convenience can additionally claim value determinism, not just the
shape/byte determinism every project gets by default.

Update `.claude/skills/neuron-memory/SKILL.md` to document the three-way
determinism distinction from [36](36-configurable-frontmatter-schema.md)'s
answer — shape (enforceable, always on), byte (enforceable, always on, `35`),
value (only under `strict`) — and `strict` mode's explicit tradeoff: losing
auto-tag/category convenience in exchange for the literal "deterministic"
claim holding without qualification.

Independent of `43`/`44` — touches `llm.enrichment` config and skill
documentation only, not the field-schema mechanism.

## Comments

- Graduated from [36](36-configurable-frontmatter-schema.md)'s grilling,
  2026-08-03.

## Answer

Implemented as designed. `strict: z.boolean().default(false)` is a new
top-level key in `NeuronConfigSchema` (`src/config/neuronYaml.ts`), sibling
to `storage`/`categories`/`llm`, not nested under `llm.enrichment` — it's a
project-wide posture, not a per-field enrichment switch.

`NeuronMemory.enrichUpsert` (`src/index.ts`) reads it once alongside the
existing `llm.enrichment` config and uses it to gate the two content-driven
inference paths without touching a third: `wantsTags` is forced `false`
under `strict` regardless of `llm.enrichment.tags`, so an entry gets exactly
the tags the caller passed (or none) and the tag-vocabulary embed never
runs. Category inference is gated at the point `wantsCategory` is handled:
under `strict`, `cfg.categoryStrategy`'s centroid/model branch is skipped
entirely — no embed, no centroid lookup, no model call — and `cfg.category`
is consulted directly. A literal declared category name there still
resolves as the category (this is a fixed, content-independent default, not
inference, so leaving it live under `strict` doesn't reopen the
value-determinism gap); left at the default `infer` with no fallback
configured, the write hard-errors via the same `categoryRequired` helper
every other required-category path uses, naming `strict: true` as the cause
so the error is distinguishable from the pre-existing `category: off` and
`enabled: false` variants.

**Not touched:** the literal-fallback mechanism itself, `llm.enrichment.tags`
and `llm.enrichment.categoryStrategy`'s own schema/values, and shape/byte
determinism (`35`/`37`/`43`/`44`) — those were already always-on and this
ticket's scope was only the value leg.

Five new tests: three behavioural (`src/enrichment.test.ts` — tags never
auto-fill under `strict` even with a strong vocabulary match; an omitted
category with no fallback hard-errors naming `strict: true`; a literal
`llm.enrichment.category` fallback still resolves under `strict` against a
*cold* store with zero centroids, which is the structural proof that
inference was skipped rather than merely returning empty) and two config
(`src/config/neuronYaml.test.ts` — `strict` defaults to `false`; an explicit
`strict: true` parses). Full suite 471/471 green (466 + 5), all 45 files.

`.claude/skills/neuron-memory/SKILL.md` gained a new §0b ("Determinism:
Shape, Byte, Value — and `strict` Mode") between the write-side-enrichment
interview and the context-loading section, documenting the three-way split
from `36`'s answer as a table, what `strict: true` does and deliberately
does not touch, and the explicit trade-off against §0a's own recommended
posture (`--category` passed, tags left to infer) — `strict` is presented as
an opt-in for a user who has explicitly said the literal "deterministic"
claim outweighs the convenience, not a new default recommendation.
