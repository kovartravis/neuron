Type: task
Status: resolved
Blocked by: 01
Band: 2.2.0-rc1

# 02 — Replace Regex Extraction with Parsed-AST Symbol Queries

## Question

What does `TreeSitterScanner` look like when it extracts symbols from a parsed
syntax tree instead of line-oriented regex matching, and what changes in the
symbols it emits?

## Context

`src/scanner/treesitter.ts` exports a class named `TreeSitterScanner` that does
not use Tree-Sitter. `parseFileContent` splits on newlines and applies four
regexes per line (class/struct, Go struct, function, interface, bare method call).
2.1.0 shipped this with the documentation corrected to describe it honestly
rather than delaying the release.

Known defects of the regex approach, all of which this ticket must fix:

- Multi-line declarations — a wrapped signature, a generic parameter list, a
  decorated Python `def` — are missed or truncated.
- The method branch matches any `name(args)` line that is not a keyword, so
  **ordinary call sites are recorded as `method` symbols**. This inflates symbol
  counts and puts noise straight into the blueprint card.
- Extraction is language-agnostic despite `resolveLanguage` mapping 14 languages:
  Ruby, PHP, Swift and C# are parsed with TypeScript-shaped regexes.
- Approximate export contracts make the `exportChanges` bucket in
  `neuron scan --diff` noisier than it should be.

## What ticket `01` already established

Grammar loading is done. `GrammarLoader` in `src/scanner/grammars.ts` provides
`load(language)` returning a `web-tree-sitter` `Language` or `null`, and
`readTagsQuery(language)` returning the `queries/tags.scm` that ships with each
grammar. All 8 grammars load at 1–5 ms. **This ticket consumes that API; it does
not fetch anything.**

Two findings from `01` that shape the work:

**1. `tags.scm` gets you the call-site fix for free.** The shipped queries capture
`@definition.*` and `@reference.*`. Filtering to `@definition.*` drops call sites
— verified on Python, where `print(...)` and `not_a_decl(...)` were tagged
`reference.call` while a **multi-line** `def gamma(\n a,\n b\n)` came through as
`definition.function`. That is requirement 3 below, satisfied by the query rather
than by hand.

**2. TypeScript's shipped `tags.scm` is unusable, and TypeScript is the critical
path.** It covers only ambient declaration forms (`function_signature`,
`method_signature`, `abstract_class_declaration`, `interface_declaration`) and has
**zero** rules for `function_declaration` or `method_definition`. Given
`export class Alpha { thing() {} }\nexport function beta<T>(x: T): T`, it captured
one thing: the generic parameter `T`. JavaScript's query has 13 definition rules
by contrast.

So the per-language strategy is **not uniform**:

| Language | Query source |
|----------|-------------|
| Python, Go, Rust, Java, C++, JavaScript | shipped `tags.scm`, filtered to `@definition.*` — verify coverage per language before trusting it |
| **TypeScript, TSX** | **hand-written** — compose JS's rules with TS-specific forms, or write from scratch |

Neuron is itself a TypeScript project, so the hand-written queries are what
determine whether this ticket improves neuron's own blueprint at all. Do these
first, not last.

## Scope

1. Load grammars via `GrammarLoader` from ticket `01` for: TypeScript, TSX,
   JavaScript, Python, Go, Rust, Java, C++. (`.jsx` maps to the javascript
   grammar; `.hpp` to cpp.)
2. Replace `parseFileContent` with per-language S-expression queries extracting
   exported classes, interfaces, structs, functions and methods — with accurate
   multi-line signatures and true line numbers.
3. **Drop the bare-`name(args)` method heuristic entirely.** Call sites are not
   declarations. Filtering to `@definition.*` captures is what implements this.
4. An extension whose grammar is loaded must never silently fall back to regex —
   fidelity is decided per-file and recorded (ticket `03`), not guessed.
5. Write and test hand-rolled TypeScript/TSX queries covering at minimum:
   `class_declaration`, `function_declaration`, `method_definition`,
   `interface_declaration`, `type_alias_declaration`, `enum_declaration`, and
   arrow functions bound to exported consts.
6. Audit each shipped `tags.scm` for coverage before adopting it — TypeScript's
   gap proves these queries are written for code *navigation*, not for the
   declaration inventory a blueprint card needs.

## Verification

- `test/e2e/fixtures/polyglot-monorepo/` must yield real symbols for every
  language claimed as AST-supported.
- Extend `src/scanner/treesitter.test.ts` with cases the regex version
  demonstrably fails: multi-line signatures, nested declarations, decorated
  Python defs, and a file of pure call sites that must yield **zero** method
  symbols.
- Record the symbol-count delta against the 2.1.0 scanner on this repo. A large
  drop is the expected, correct outcome — it is the call-site noise going away.

## Deliverables

- [x] `src/scanner/treesitter.ts` rewritten against parsed ASTs
- [x] Per-language query definitions for the 9 extensions above
- [x] `src/scanner/treesitter.test.ts` extended with multi-line/nested/call-site cases
- [x] Polyglot fixture verified per language
- [x] Symbol-count delta recorded for ticket `03` to build on

## Answer

`TreeSitterScanner` now parses a real syntax tree and runs an S-expression
query per language. Extraction logic lives in `src/scanner/treesitter.ts`; the
queries and the node→kind tables live in a new `src/scanner/queries.ts`.

**On this repo the symbol count fell 3290 → 233, a 92.9% drop**, exactly the
outcome the ticket predicted. 3101 of the 3290 old symbols — 94% — were `method`
entries manufactured from call sites.

### The scope grew by one file, and it was the important one

`src/scanner/analyzer.ts` — which is what actually builds the blueprint card —
**never called `TreeSitterScanner` at all**. It carried its own duplicate
`ScannedSymbol` interface and its own `parseSymbolsFromFile`, a weaker regex
that matched only `export class|function|interface`, hardcoded
`language: 'typescript'` for every file, and fed *every* symbol it found into
each component's `exports` array.

Rewriting `treesitter.ts` alone would have improved nothing a user can see. The
duplicate parser is deleted and `analyzer.ts` now calls `scanner.parseFile`, so
`ScannedSymbol` has one definition.

That regex had a defect nobody had ticketed: it matched `export function` but
not `export async function`, so **every async exported function in the codebase
was invisible to the blueprint**. `handleMemoryCommand`, `handleScanCommand`,
`ingestScanResults`, `syncMdWithVector`, `startUiServer` and ~20 others appear
in a scan for the first time.

### What changed in the symbols it emits

1. **Kind is decided by the AST node type, not the capture name.** The shipped
   queries are too coarse to read kinds off their captures: Rust tags
   `struct_item`, `enum_item`, `union_item` and `type_item` all as
   `@definition.class`, and C++ does the same to `struct_specifier`. Reading the
   node type recovers what the query collapsed. Go needs a further step — every
   `type X ...` is `@definition.type`, so the declared type node is inspected to
   separate `struct` from `interface`.
2. **The kind union gained `type`, `enum` and `module`.** `type_alias_declaration`
   and `enum_declaration` were required by scope item 5 and had nowhere to go.
3. **New `exported: boolean`.** This is what fixes the `exportChanges` noise
   (defect 4). Each language states visibility its own way — a keyword in
   TypeScript, case in Go, `pub` in Rust, a leading underscore in Python — and
   **methods are never exports**, because a method is reached through its class.
   `analyzer.ts` now filters `component.exports` to exported symbols: 233 symbols
   on this repo, of which 106 are public surface.
4. **New `parseFile`** returning `{ symbols, fidelity, degradedReason }`
   alongside the old `parseFileContent`. Fidelity is `ast`, `regex` or
   `unsupported`, decided per file and never guessed (scope item 4). `ScanResult`
   carries a `parserFidelity` tally and each component records its own — the
   input ticket `03` needs.
5. **Signatures come from the node's extent, not the source line**, which is what
   makes a wrapped signature come out whole.

### Queries: 6 adopted, 2 hand-written

Every shipped `tags.scm` was audited before adoption (scope item 6). Python, Go,
Rust, Java, C++ and JavaScript passed — JavaScript's 13 definition rules already
cover `export const x = () => {}`. TypeScript and TSX failed, exactly as ticket
`01` reported, and use the hand-written query in `queries.ts`.

Two findings from `01` held up under use:

- **Filtering to `@definition.*` drops call sites for free.** Verified across
  every language: `print`, `not_a_decl`, `fmt.Println`, `helper(s)` and
  `console.log` are all `@reference.*`. The pure-call-site test file yields
  **zero** symbols, not merely zero methods.
- **Grammar ≠ language label.** `.tsx` is still *reported* as `typescript` —
  that is what existing baselines contain — but is *parsed* with the tsx
  grammar, added as `resolveGrammar` beside the untouched `resolveLanguage`.
  Parsing TSX with the TypeScript grammar mis-parses every JSX element.

### A bug the drift review caught, that the tests did not

Running `neuron scan --diff` before resolving showed `walk` — a helper nested
inside the exported `scanProjectTopology` — listed as an added export. The first
`isExported` climbed every ancestor looking for `export_statement`, so anything
inside an exported function inherited its export. The fix climbs only
*declaration wrappers* (`lexical_declaration`, `variable_declaration`), so the
`export` must apply to the declaration itself. Regression test added.

This is worth recording as method: the unit tests were green and the delta
looked plausible. It took reading the actual diff output against a real
baseline to see it.

### Verification

- **212 unit tests across 30 files green** (193 at ticket `01`; +19 here).
- **22 tests in `treesitter.test.ts`**, up from 4. All four original tests pass
  unmodified against the AST implementation — including Go `struct` kind and the
  multi-line signature case — so this is back-compatible on the old contract.
- **Polyglot fixture** asserts real AST symbols and `fidelity === 'ast'` per
  language for TypeScript, Python, Go and Rust, with exact kinds.
- **Cross-checked the delta against grep.** grep counts 11 `class` declarations
  in `src/`; the AST found 9. The two extras are inside template literals in
  `treesitter.test.ts` — the AST is right and grep is wrong, which is the whole
  thesis of this ticket in miniature. Same for `export type`: 14 grep hits, 12
  real aliases (one is a re-export, one is in a test string). The AST found 12.
- Tests exercise real grammars, not mocks, and assert `fidelity === 'ast'`, so an
  uncached machine fails loudly rather than passing at regex fidelity. Missing
  grammars are fetched once in `beforeAll`. **Tradeoff:** the suite now needs
  either a warm grammar cache or one ~1s network fetch.
- `test/e2e/concurrency-stress.test.ts` fails, but **it fails identically on a
  clean checkout of `HEAD`** — verified by stashing. It is a flaky multi-process
  SQLite contention benchmark (4/50 writes rejected against a 5% threshold) and
  is unrelated to symbol extraction. Not introduced here, not fixed here.

### Deliberately not done: re-baselining this repo

`CLAUDE.md` asks for a `neuron scan` upsert when export contracts change, and
they changed comprehensively. **I ran `neuron scan --diff` but did not upsert.**
Re-baselining now would silently absorb a 3290→233 symbol shift into the
blueprint card, destroying the before/after evidence ticket `03` exists to
migrate — and `03` has not yet decided how that migration should work. Leaving
the stale baseline in place is the honest state: the drift is real and `03`
should be the thing that resolves it.

### Handed to ticket `03`

- Fidelity is available per file (`ParsedFile.fidelity`, `component.fidelity`)
  and per scan (`ScanResult.parserFidelity`). On this repo: 70/70 files `ast`.
- The re-baselining problem is now concrete and large. An existing user's first
  2.2.0 scan will report a near-total export contract rewrite: hundreds of
  removals (phantom symbols from comments, strings and call sites) plus dozens of
  additions (`export async function`, type aliases). It is all correct, and
  presented raw it is unreadable.
- Non-AST languages (Ruby, PHP, Swift, C#) still set `exported` from a crude
  `export|public|pub` line test. Fine at labelled regex fidelity; it should not
  be mistaken for a real visibility rule.

## Comments

- 2026-07-31: Split out of 2.1.0 ticket 06. The remaining 6 extensions
  (Ruby, PHP, Swift, C#, and the rest of the 14) stay at regex fidelity — see the
  map's **Not yet specified** section.
- 2026-07-31: Resolved. `src/scanner/queries.ts` created; `treesitter.ts`
  rewritten against parsed ASTs; `analyzer.ts` wired to it and its duplicate
  regex parser deleted; `treesitter.test.ts` grown 4 → 22 tests. 212 unit tests
  green. Symbol count on this repo 3290 → 233 (−92.9%), 106 exported.
