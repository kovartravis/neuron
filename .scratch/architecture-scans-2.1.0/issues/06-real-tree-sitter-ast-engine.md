Type: task
Status: unclaimed
Blocked by: none

# 06 — Replace the Pattern-Matching Scanner with a Real Tree-Sitter AST Engine

## Goal

Make `docs/adr/0003` true. `neuron scan` should extract symbols from a parsed
syntax tree rather than from line-oriented regex matching.

## Context

Filed during 2.1.0 release preparation. `src/scanner/treesitter.ts` exports a
class named `TreeSitterScanner`, but it does not use Tree-Sitter:

- `web-tree-sitter` is not in `dependencies` and is not installed.
- Nothing in `src/` imports it; no `.wasm` grammar is loaded at runtime.
- `parseFileContent` splits the file on newlines and applies four regexes
  (class/struct, Go struct, function, interface, bare method call) per line.

Consequences that are visible today:

- Multi-line declarations (a signature wrapped across lines, a generic
  parameter list, a decorated Python `def`) are missed or truncated.
- The method-detection branch matches any `name(args)` line that isn't a
  keyword, so ordinary call sites are recorded as `method` symbols. This
  inflates the symbol count and puts noise into the blueprint card.
- `resolveLanguage` maps 14 extensions, but the extraction logic is
  language-agnostic — Ruby, PHP, Swift, and C# get TypeScript-shaped regexes.
- Export contracts in the blueprint are approximate, which in turn makes the
  `exportChanges` bucket in `neuron scan --diff` noisier than it should be.

2.1.0 ships the pattern matcher with the documentation corrected to describe
it accurately (`CONTEXT.md`, `README.md`, ADR 0003 status note). This ticket
tracks doing the real thing.

## Requirements

1. Add `web-tree-sitter` as a runtime dependency and decide the grammar
   distribution strategy — bundling every `.wasm` grammar in the npm tarball is
   the main cost driver, so evaluate lazy download-on-first-use against package
   size. Record the decision in a new ADR (0008) and update ADR 0003's status.
2. Load compiled grammars for at minimum the languages the scan claims to
   support: TypeScript/JS/TSX/JSX, Python, Go, Rust, Java, C++.
3. Replace `parseFileContent` with S-expression queries per language that
   extract exported classes, interfaces, structs, functions, and methods with
   accurate multi-line signatures and line numbers.
4. Drop the bare-`name(args)` method heuristic — call sites must not be
   recorded as declarations.
5. Keep `SUPPORTED_SOURCE_EXTENSIONS` as the single source of truth, and make
   an extension without a loaded grammar fail loudly rather than silently fall
   back to regex.
6. Handle the no-grammar-available path explicitly: either a clear error or a
   documented degraded mode, not a silent quality drop.
7. Verify against `test/e2e/fixtures/polyglot-monorepo/` that every advertised
   language yields real symbols, and extend `src/scanner/treesitter.test.ts`
   with multi-line and nested-declaration cases that the regex version fails.
8. Re-baseline the drift fixtures — symbol extraction changing will move the
   `exportChanges` bucket, so Pillar 4 of the E2E suite needs a fresh baseline.

## Deliverables

- [ ] `docs/adr/0008-*.md` (grammar distribution decision) + ADR 0003 status update
- [ ] `web-tree-sitter` dependency and grammar assets/loader
- [ ] `src/scanner/treesitter.ts` rewritten against parsed ASTs
- [ ] `src/scanner/treesitter.test.ts` extended with multi-line/nested cases
- [ ] Re-baselined E2E drift fixtures
- [ ] `CONTEXT.md` and `README.md` wording restored to describe AST parsing
- [ ] Package-size impact measured and recorded

## Comments

- 2026-07-31: Filed while preparing the 2.1.0 stable release. Docs were
  corrected rather than the implementation, at the user's direction, to avoid
  blocking the release on grammar packaging work.
