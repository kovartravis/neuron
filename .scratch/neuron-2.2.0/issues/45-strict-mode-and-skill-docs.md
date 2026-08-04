Type: task
Status: unclaimed
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
