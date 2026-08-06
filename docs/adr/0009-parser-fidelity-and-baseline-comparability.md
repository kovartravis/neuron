# 9. Parser Fidelity: Cards Record Their Instrument, and Refuse Incomparable Diffs

Date: 2026-08-01

## Status

**Accepted** (2.2.0-rc1). Completes the upgrade path opened by ADR 0008 and the
AST rewrite it enabled.

## Context

`neuron scan --diff` reports the difference between two measurements: the
blueprint card stored in memory, and a fresh scan of the tree. ADR 0008 and the
2.2.0 AST rewrite changed the instrument that takes those measurements.

On this repository the change moved symbol counts from 3290 to 233 — a 93% drop,
almost entirely call sites that the old regex scanner had recorded as `method`
symbols. It simultaneously *added* symbols the old scanner never saw, because its
export pattern matched `export function` but not `export async function`.

Nothing in the card recorded which parser produced it. So the first
`scan --diff` after upgrading would compare a regex-derived baseline against an
AST-derived scan and report hundreds of changes across all four drift buckets,
none of which any user made. `--check` is a CI gate, so for those users the
upgrade turns a green build red for reasons unrelated to their code.

The regex fallback changed too — 2.2.0 dropped the bare-`name(args)` heuristic —
so this is not simply "regex versus AST". Two regex-derived cards from different
neuron versions are also incomparable.

## Decision

**A blueprint card records the parser that produced it, and a diff across a
parser change is refused rather than reported.**

Four choices make up that decision.

### 1. Fidelity is versioned, not just named

The descriptor is `<parser>/<generation>` — `ast/2`, `regex/2`. The generation is
a single integer bumped whenever symbol extraction changes shape, including
changes to the regex fallback. Generation 1 is the 2.1.0 scanner; generation 2 is
the 2.2.0 Tree-Sitter rewrite.

Recording only `ast` or `regex` would have solved today's migration and left the
next one unsolved: a future release that improves extraction while remaining
"ast" would compare clean against an older `ast` card and reintroduce exactly the
phantom drift this ADR exists to remove. Adding the generation later would mean a
second card-format migration, which is the expensive thing here.

### 2. The card stores a default plus exceptions

```markdown
## 🔬 Parser Fidelity
Default: `ast/2`
Degraded:
- `cmd/main.go` — `regex/2` (no grammar available)
```

A single scan legitimately mixes fidelities when some grammars are absent, so the
card must express a mix. Two forms were rejected:

- **A label per component line.** The card is vector-indexed for semantic
  retrieval, and repeating `Parser: ast` across every component line dilutes the
  embedding with a token carrying no distinguishing information.
- **A bare card-level `mixed`.** Provably insufficient: a baseline that is mixed
  because Go degraded and a scan that is mixed because Rust degraded would
  compare equal while disagreeing about both languages' symbols.

Comparison therefore includes the exception map, not just the default.

### 3. Refusal is all-or-nothing

Any fidelity mismatch replaces the whole diff with a "re-baseline required"
result. A per-file rule was considered — diff the files whose fidelity matches,
quarantine the rest — and rejected for the complexity it pushes into every
consumer of `ArchitecturalDiff` in exchange for a benefit confined to *partial*
grammar failure. Under total grammar loss, which is the common failure, both
designs refuse everything anyway.

The cost is accepted knowingly: one grammar failing to fetch refuses the entire
diff, and since re-baselining accepts the current state as truth, a grammar that
flaps in and out forces repeated re-baselines that absorb real drift.

### 4. `--check` gets a third exit code

```
0  in sync
1  architectural drift detected
2  baseline not comparable — re-baseline required
```

Failing CI with phantom drift is wrong; passing a gate that measured nothing is
also wrong. A distinct code is non-zero — so it cannot pass unnoticed — while
letting a CI author tolerate a re-baseline separately from tolerating drift, which
are different events with different fixes.

### Absence means generation 1

A card with no fidelity section reads as `regex/1`, not as unknown. Nothing before
2.2.0 could write the section, and everything before 2.2.0 used the generation-1
regex scanner, so absence positively identifies a pre-2.2.0 card.

### The two paths diverge

- **Explicit** (`--diff` / `--check`) reports the refusal, names `neuron scan` as
  the fix, and exits 2.
- **Implicit** (the auto-rescan behind `memory query`) re-baselines silently. It
  exists to keep the card fresh without the user thinking about it, and the
  condition resolves itself in the same breath it would be reported. Reusing the
  drift or missing-baseline message would state something untrue.

## Consequences

**The upgrade is safe but not instantaneous.** The drift fingerprint
(`src/scanner/fingerprint.ts`) hashes file paths, mtimes and sizes — not parser
identity — so upgrading neuron without touching a file leaves it unchanged and
the implicit re-scan is skipped. The migration surfaces on the next explicit
`--diff`/`--check`, which always scan, or on the next implicit rescan after any
source edit. Adding parser identity to the fingerprint was considered and
declined: it would force a full re-scan of every project on every upgrade, and in
an active repository the delay it avoids is minutes.

**Re-baselining is destructive.** It accepts the current tree as truth, so drift
that accumulated before the parser change is absorbed without ever being
itemised. This is unavoidable — that drift was measured with an instrument whose
readings we have just declared incomparable.

**Degradation is now loud.** A language that has a grammar but could not load it
writes a warning to stderr naming the language and `neuron init`. Languages with
no grammar at all (Ruby, PHP, Swift, C#) stay silent, because their regex
fidelity is expected rather than a fault.

**One generation constant governs a lot.** `SCANNER_GENERATION` in
`src/scanner/fidelity.ts` must be bumped whenever extraction changes shape.
Forgetting to bump it reintroduces phantom drift; bumping it unnecessarily forces
every user to re-baseline. There is no way to derive it automatically.

## Related

- ADR 0003 — `web-tree-sitter` as the AST engine
- ADR 0006 — architectural drift detection and diffing
- ADR 0008 — grammar distribution
