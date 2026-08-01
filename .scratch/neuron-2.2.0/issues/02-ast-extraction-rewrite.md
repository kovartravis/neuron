Type: task
Status: unclaimed
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

- [ ] `src/scanner/treesitter.ts` rewritten against parsed ASTs
- [ ] Per-language query definitions for the 9 extensions above
- [ ] `src/scanner/treesitter.test.ts` extended with multi-line/nested/call-site cases
- [ ] Polyglot fixture verified per language
- [ ] Symbol-count delta recorded for ticket `03` to build on

## Comments

- 2026-07-31: Split out of 2.1.0 ticket 06. The remaining 6 extensions
  (Ruby, PHP, Swift, C#, and the rest of the 14) stay at regex fidelity — see the
  map's **Not yet specified** section.
