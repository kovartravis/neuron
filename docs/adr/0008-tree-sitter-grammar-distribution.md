# 8. Tree-Sitter Grammar Distribution: Fetch at Init, Cache on Disk

Date: 2026-07-31

## Status

**Accepted** (2.2.0-rc1). Implements the grammar-delivery half of ADR 0003.

## Context

ADR 0003 committed to `web-tree-sitter` as the AST engine but left grammar
delivery unspecified, and 2.1.0 shipped without implementing either half. Making
0003 true requires answering a question it never addressed: how do compiled
`.wasm` grammars reach a user's machine?

The constraint is package weight. `@kovartravis/neuron` packs to ~612 KB, and its
positioning is a local-only memory store — something developers install without
thinking about it. Measured sizes for the eight grammars 2.2.0 targets:

| Grammar | Size | Grammar | Size |
|---------|------|---------|------|
| cpp | 3.28 MB | python | 0.44 MB |
| tsx | 1.38 MB | java | 0.40 MB |
| typescript | 1.35 MB | javascript | 0.39 MB |
| rust | 1.05 MB | go | 0.21 MB |

**Total: 8.49 MB** — a 14× increase on the packed tarball if bundled, paid by
every user regardless of which languages they actually scan.

There is an established precedent in the codebase. The ONNX models (BGE-small,
Qwen1.5-0.5B) are far larger and are **not** bundled: `neuron init` downloads and
preloads them into an `env-paths` cache (`src/commands/init.ts`). Grammars are the
same class of asset — large, language-specific, cacheable across projects.

## Options considered

1. **Bundle all grammars in the tarball.** Zero network, fully offline, no cache
   logic. Rejected: 14× package growth, and every user carries grammars for
   languages they will never scan.
2. **`optionalDependencies` on grammar packages.** npm handles fetching, works
   through corporate mirrors and the npm cache, no bespoke download code.
   Rejected: install-time weight is still unconditional, and it couples neuron's
   dependency tree to eight independently-versioned packages.
3. **Fetch at `neuron init`, cache on disk.** Chosen.

## Decision

Fetch compiled grammars at `neuron init` and cache them in the `env-paths` data
directory, shared across projects.

**Source: the official `tree-sitter-<lang>` npm packages.** These ship a prebuilt
`.wasm` *and* a `queries/tags.scm`. Verified during implementation — an earlier
assumption that they shipped only C sources was wrong. This is preferable to the
community `tree-sitter-wasms` bundle (51.8 MB, single maintainer, and it declares
a dependency on itself) and to `@vscode/tree-sitter-wasm` (22 MB, narrower
language set).

Specifics:

- **Only `web-tree-sitter` is a runtime dependency** (~4.4 MB in `node_modules`).
  Grammar packages are *not* dependencies; their tarballs are fetched from the
  registry and the two needed files extracted.
- **Grammar versions are pinned**, not ranged. A grammar changing shape underneath
  a released neuron would silently move every blueprint card and manufacture
  architectural drift that never happened.
- **A manifest attributes each cached `.wasm` to its pinned package version.** A
  grammar counts as cached only when the manifest matches; a stray or
  unattributable `.wasm` is ignored rather than loaded, because an ABI or
  grammar-shape mismatch fails silently by moving symbol extraction.
- **The configured npm registry is honoured** via `npm_config_registry`, so
  corporate mirrors work.
- **Tar extraction is hand-rolled** (~40 lines) rather than adding a `tar`
  dependency to pull two files per grammar.
- **`NEURON_GRAMMAR_DIR` overrides the cache location** for CI caching and
  constrained environments.
- **Failure is never fatal.** An unreachable registry, a 404, a corrupt tarball or
  a missing artifact leaves that language on the regex scanner and `neuron init`
  completes, matching how model pre-download failures are already absorbed. Init
  reports which grammars are unavailable and what that costs.

## Consequences

**Good.**

- Package stays at 612.6 KB with zero `.wasm` files in the tarball.
- All 8 grammars fetch in ~1.0s and load in 1–5 ms each; ABI 14 and 15 both work
  against `web-tree-sitter` 0.26.11.
- The cache is shared across projects — a developer with ten repos downloads once.
- `queries/tags.scm` arrives free with each grammar, which ticket 02 consumes.

**Bad.**

- First `neuron init` needs network for full-fidelity scanning. Offline installs
  scan at regex fidelity until init is re-run.
- A second download path exists alongside the model downloader, with its own
  failure modes.
- Pinned versions mean grammar updates are a deliberate release action, not a
  passive improvement.

**Deliberately deferred.**

- Only 8 of the 14 extensions in `SUPPORTED_SOURCE_EXTENSIONS` get grammars.
  Ruby, PHP, Swift and C# remain on the regex scanner at labelled fidelity.
- Integrity checking is version-attribution only; no checksum verification against
  the registry's `dist.integrity`. Worth adding if grammars are ever served from
  somewhere less trusted than the npm registry over TLS.

## Note for implementers

The shipped `tags.scm` files are **not** uniformly usable for symbol extraction:

- They capture `@reference.*` alongside `@definition.*`. Filtering to
  `@definition.*` is what drops call sites — the noise ticket 02 exists to remove.
- **TypeScript's `tags.scm` is unusable as shipped.** It covers only ambient
  declaration forms (`function_signature`, `method_signature`,
  `abstract_class_declaration`, `interface_declaration`) and has **no** rules for
  `function_declaration` or `method_definition`. A concrete `export class Foo {
  bar() {} }` yields nothing. JavaScript's has 13 definition rules by comparison.
  TypeScript and TSX need hand-written queries.
