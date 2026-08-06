Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc1

# 01 — Tree-Sitter Grammar Acquisition & Init-Time Caching

## Question

How do compiled `.wasm` Tree-Sitter grammars get onto a user's machine, stay
cached across projects, and fail comprehensibly when they cannot?

## Premise (settled while charting)

Grammars **fetch at `neuron init`** and cache in the `env-paths` data dir. This
mirrors the existing ONNX model flow (`src/commands/init.ts:28-43`), which
already downloads BGE-small and Qwen1.5-0.5B with a progress bar rather than
bundling them.

The alternative — bundling grammars in the tarball — was rejected: the package
is 621 KB packed / 814 KB unpacked today, and 8 grammars would push it to roughly
20 MB, a 30× increase on a package whose pitch is "local-only".

## Scope

1. Add `web-tree-sitter` as a runtime dependency.
2. Decide and implement the grammar **source**: which artifacts, from where.
   `tree-sitter-<lang>` npm packages, a GitHub release, or a CDN — evaluate for
   availability, versioning and corporate-mirror friendliness.
3. Fetch grammars during `neuron init`, reusing `ScanProgressBar` so the phase is
   visible alongside the existing model downloads.
4. Cache in the `env-paths` data dir next to `models/` (e.g. `grammars/`), shared
   across projects. Include a version/integrity marker so an upgraded neuron does
   not silently reuse stale grammar builds.
5. Handle failure explicitly: no network, partial download, corrupt file, mirror
   blocked. `neuron init` must not hard-fail the whole bootstrap because a
   grammar was unreachable — the existing code already swallows model
   pre-download errors (`init.ts:43`), so match that tolerance while still
   reporting clearly.
6. Expose a loader API that ticket `02` consumes: given an extension, return a
   loaded grammar or a definite "not available".

## Constraints

- The `DynamicGrammarLoader` stub already exists at `src/scanner/treesitter.ts:23`
  with `isLanguageSupported` and `resolveLanguage`. Grow it rather than replacing
  it wholesale — `resolveLanguage` maps all 14 extensions and stays the mapping
  source of truth.
- `SUPPORTED_SOURCE_EXTENSIONS` (`src/scanner/treesitter.ts:18`) remains the
  single source of truth for language support.
- Measure and record the package-size impact and the added `neuron init` wall time.

## Deliverables

- [ ] `docs/adr/0008-*.md` — grammar distribution decision; update ADR 0003 status
- [ ] `web-tree-sitter` dependency
- [ ] Grammar fetch + cache implementation wired into `neuron init`
- [ ] Loader API with an explicit "grammar unavailable" result
- [ ] Tests covering cache hit, cache miss, offline, and corrupt-artifact paths
- [ ] Recorded: package size delta and `neuron init` time delta

## Answer

Grammars fetch at `neuron init` from the **official `tree-sitter-<lang>` npm
packages** and cache in the `env-paths` data dir. Implemented in
`src/scanner/grammars.ts`; decision recorded in
[ADR 0008](../../../docs/adr/0008-tree-sitter-grammar-distribution.md).

### The source decision

The ticket left "which artifacts, from where" open. Three candidates were
measured:

| Source | Size | Verdict |
|--------|------|---------|
| `tree-sitter-wasms` | 51.8 MB | Rejected — single maintainer, 9 months stale, and it declares a dependency on **itself** |
| `@vscode/tree-sitter-wasm` | 22 MB | Rejected — narrower language set |
| Official `tree-sitter-<lang>` | 8.49 MB total | **Chosen** |

A charting-time assumption turned out to be wrong: the official packages **do**
ship prebuilt `.wasm`, and they also ship `queries/tags.scm`. That makes them
both the smallest and the most trustworthy source, and it hands ticket `02` its
queries for free.

### Verified against the live registry

- All 8 grammars fetch in **1.0s total**, 8.49 MB.
- All 8 load in `web-tree-sitter` 0.26.11 at **1–5 ms each**. ABI 14 and 15 both
  work — the ABI mismatch risk that could have sunk this approach does not exist.
- Tarball is **612.6 KB with zero `.wasm` files**. The size decision holds.
- `web-tree-sitter` adds ~4.4 MB to `node_modules` as the only new dependency.
- Full unit suite green: **193 tests, 30 files**.

### Implementation notes

- **Versions are pinned, not ranged.** A grammar changing shape underneath a
  released neuron would silently move every blueprint card and manufacture drift
  that never happened.
- **A manifest attributes each cached `.wasm` to its pinned version.** An
  unattributable `.wasm` is ignored rather than loaded — an ABI or grammar-shape
  mismatch fails silently, which is the worst failure mode available here.
- **One tarball can satisfy several grammars** (`tree-sitter-typescript` carries
  both typescript and tsx), so downloads are deduplicated by package.
- **Tar extraction is hand-rolled** (~40 lines) rather than adding a `tar`
  dependency to pull two files per grammar.
- **`npm_config_registry` is honoured**, so corporate mirrors work.
- **Failure is never fatal.** Unreachable registry, 404, corrupt tarball or
  missing artifact each leave that language on the regex scanner; init completes
  and reports what is unavailable.

### New: `NEURON_GRAMMAR_DIR`

Added as a cache-location override. It exists because resolving through
`env-paths` reads the home directory once per process, so tests could not vary it
between cases — but it is a real feature for CI cache restoration and constrained
environments, not a test hook.

### Findings handed to ticket `02`

The shipped `tags.scm` files are **not** a drop-in for symbol extraction:

1. They capture `@reference.*` alongside `@definition.*`. Filtering to
   `@definition.*` is exactly what drops call sites — verified: Python's query
   correctly tagged `print` and `not_a_decl` as `reference.call` while capturing a
   **multi-line** `def gamma(...)` as `definition.function`. This satisfies the
   ticket `02` requirement to drop the bare-`name(args)` heuristic, and it comes
   for free.
2. **TypeScript's `tags.scm` is unusable as shipped.** It covers only ambient
   declaration forms and has **no** rules for `function_declaration` or
   `method_definition`. A concrete `export class Alpha { thing() {} }` yields
   nothing but a stray generic parameter. JavaScript's has 13 definition rules.
   **TypeScript and TSX need hand-written queries** — and TypeScript is this
   project's own language, so this is ticket `02`'s critical path, not an edge
   case.

Ticket `02` has been updated with both findings.

## Comments

- 2026-07-31: Split out of
  [06 — Real Tree-Sitter AST Engine](../../architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md)
  (2.1.0 map), which bundled acquisition, extraction and re-baselining into one
  ticket. Acquisition is separable and blocks the other two.
- 2026-07-31: Resolved. `web-tree-sitter@0.26.11` added; `src/scanner/grammars.ts`
  and `src/scanner/grammars.test.ts` created (14 tests); `neuron init` wired with
  progress + unavailability reporting; ADR 0008 landed; ADR 0003 moved from
  *Deferred* to *Partially implemented*.
