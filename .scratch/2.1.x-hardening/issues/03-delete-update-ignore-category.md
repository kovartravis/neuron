Type: task
Status: resolved
Blocked by: none

# 03 — `memory delete`/`update` Required `--category`, Then Never Used It

## Question

Does the `--category` flag that `delete` and `update` require actually
scope which entry gets touched?

## Context

Both subcommands validate that `--category` was passed and error if it's
missing. Neither included it in the SQL:

```sql
-- delete, before
DELETE FROM memories WHERE id = ? AND project_id = ?
```

Verified live: deleting a `history` entry while passing `--category
learning` reported `{"status":"deleted"}`. `update` had the identical shape
— it could silently overwrite a `decisions` ADR while claiming `learning`.
The required flag validated its own presence and nothing else.

This chained with a second bug: `memory list --categories a,b` read only the
singular `options.category` and returned every category unfiltered — the
exact pattern the packaged skill's own maintenance workflow uses (`list
--categories learning` to review, then `delete --category learning` on
whatever id is found). An agent following that workflow could believe it
was reviewing only learnings and then delete an entry from any category.

## Answer

Resolved 2026-08-01. `delete` and `update` now include `AND category = ?`
in their predicates; a mismatched category is treated as `not_found` and
nothing is modified. **This is a real behaviour change** — a call that
previously "succeeded" against the wrong category now fails, which is what
the required flag always implied it would do. `list` now reads
`options.categories ?? options.category`, matching `query`.

Shipped as `v2.1.4`
([`1101e90`](https://github.com/kovartravis/neuron/commit/1101e90)), forward-
ported onto `feat/2.2.0-tree-sitter-grammars`. 5 new regression tests
covering both directions (wrong category refused, correct category still
works) on `delete`, `update`, and `list`.

## Comments

- 2026-08-01: Found by deliberately grepping for "required flag whose value
  is never consulted downstream" after the argv-boundary sweep (`01`)
  surfaced the same failure shape once already. The same search pattern
  found `04` and `05` in the same session.
