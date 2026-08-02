Type: task
Status: resolved
Blocked by: none

# 04 — `dual`-Mode `update`/`delete` Reported Only Markdown's Outcome

## Question

When `storage.mode: dual` writes to both the vector DB and a `.md` file, does
the CLI's reported status reflect what actually happened to the data?

## Context

`upsert` has always trusted the vector result (`vecResult.status`). `update`
and `delete` computed the identical `vecResult` and never consulted it —
they decided success or failure purely from whether the `.md` file operation
found the id.

When the two stores disagree (a prior write landing on only one side, a
manual `.md` edit not yet `sync`'d — the kind of drift `sync` exists to
reconcile), this produced a false negative on a real change. Reproduced by
deliberately diverging the stores — writing an entry normally, then removing
only its `.md` copy:

```
$ neuron memory delete <id> --category learning
{"status":"not_found"}     # the row WAS deleted from the vector DB
```

The same happened on `update`: content was genuinely overwritten in the
vector DB while the CLI reported `not_found`, with no signal anywhere that
the stores had diverged.

## Answer

Resolved 2026-08-02. `update` and `delete` now report success if **either**
store actually changed, matching the precedent `upsert` already set. Fixed
in both `split`-mode's dual-fallback branch and `dual` mode's main loop —
identical bug, same shape, in two places. `vector-only` and `md-only` modes
were never affected.

Also aligned in the same pass: `split`-mode's per-category storage
resolution defaulted an unconfigured category to `'dual'` on write but
`'vector'` on read (`dualStorageRouter.ts:47` vs `:150`). No behavioural
effect — both branches only dispatch on `=== 'md'` — but the mismatched
literal read as if it might, so aligned for clarity.

Shipped as `v2.1.5`
([`a3a1bb3`](https://github.com/kovartravis/neuron/commit/a3a1bb3)), forward-
ported onto `feat/2.2.0-tree-sitter-grammars`. 3 new regression tests in
`dualStorageRouter.test.ts` covering both divergence directions plus the
neither-side-has-it case.

## Comments

- 2026-08-02: This ticket's investigation directly led to `05` — checking
  whether `sync`, the tool meant to *fix* the divergence this bug exposed,
  actually does so reliably. It doesn't.
