Type: task
Status: unclaimed
Blocked by: none
Band: 2.2.0-rc5

# 43 — Declarable Category Field Schema: Tiers, Types, CLI Flag Surface

## Question

Implement the field-schema design from
[36](36-configurable-frontmatter-schema.md): per-category declarable fields in
`neuron.yaml` (`string`/`enum` types, the three field tiers), a
required-but-missing policy identical to `06`'s `--category` precedent
(hard-error naming the field and category, unless a `default:` is configured),
and the config-declared-fields-become-CLI-flags mechanism — `KNOWN_FLAGS`
(`src/commands/utils.ts:68`) becomes config-derived, `--help` text generates
dynamically per project, and a declared field's flag name is checked at
config-load time for collision against the reserved built-in flag set.

Enforcement (required-ness, enum membership) must live in `NeuronMemory`'s
`transact()`, not in `parseFlags` — `parseFlags` only needs to recognise
declared flags and collect raw values, because `src/scanner/ingest.ts`'s
`ingestScanResults` writes through `transact()` directly and never touches
`parseFlags`. This is also where the `scan.category`-requires-defaults
cross-check from `36`'s answer to question 7 belongs: refuse `neuron.yaml` at
load time if the category `scan.category` points at declares a required field
with no `default:`.

Out of scope here: the SQLite column side of storage (`44`), `strict` mode
(`45`), and the `neuron status --check`/`--repair` reporting (`46`, which
depends on this ticket's schema existing to check entries against).

## Comments

- Graduated from [36](36-configurable-frontmatter-schema.md)'s grilling,
  2026-08-03.
