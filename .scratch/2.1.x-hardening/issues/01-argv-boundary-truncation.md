Type: task
Status: resolved
Blocked by: none

# 01 — Argv Boundaries Silently Discarded on `memory add`/`update`/`query`

## Question

Why does an unquoted `neuron memory add` argument get stored as a single
word, and can it happen without any error?

## Context

Discovered while investigating why 26% of this project's own memory store
(61 of 239 entries) held single-token content like `Fix`, `Updated`,
`Implemented`. All were destroyed writes, not deliberate short notes.

One root cause, four symptoms, all exiting `0`:

1. `memory add`/`update` read only `positionals[0]` and discarded the rest —
   `neuron memory add --category learning Fix for ONNX crash` stored `"Fix"`.
2. `memory query` had the same truncation — `memory query tree sitter
   grammar` silently searched for `tree` alone.
3. Unrecognised flags fell through to `positionals` and vanished — `--tag`
   (typo for `--tags`) and `--importanc` (typo for `--importance`) both
   parsed as success while dropping their values.
4. `--help` was itself unrecognised, so `neuron memory add --help` **stored
   a memory whose content was the literal string `--help`**.

Confirmed present in published stable `2.1.1` — the default install for
every user — introduced in commit `7c6eac5` (2026-07-26).

## Answer

Resolved 2026-08-01. `add`/`update` now refuse the write (non-zero exit,
nothing stored) when they receive more bare positionals than expected, with
a message suggesting quoting. `query` joins positionals instead of
truncating — a read is safe to retry, so it degrades gracefully rather than
erroring. `parseFlags` rejects unrecognised `-`/`--` tokens globally with a
nearest-match suggestion, and honours `--` as an end-of-flags escape;
`--help`/`-h` are now recognised everywhere. `neuron exec` passthrough was
confirmed unaffected — it splits at `--` before flag parsing.

Shipped as `v2.1.2`, patched off the `v2.1.1` tag
([`b56511b`](https://github.com/kovartravis/neuron/commit/b56511b)), then
forward-ported onto `feat/2.2.0-tree-sitter-grammars`. 6 new regression
tests, one per symptom.

**Not in scope for this ticket:** cleaning up the 61 already-truncated
entries in this project's own store — the maintainer explicitly declined,
since the shipped defect mattered more than this store's own damage.

## Comments

- 2026-08-01: `main` was found to be orphaned at `v2.1.0` while this and
  three sibling releases had been cut from a divergent branch and published
  to npm without ever merging back — see
  [06](06-main-orphaned-from-releases.md).
