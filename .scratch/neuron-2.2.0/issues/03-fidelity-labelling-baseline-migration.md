Type: task
Status: resolved
Blocked by: 02
Band: 2.2.0-rc1

# 03 — Parser Fidelity Labelling & Baseline Migration for Existing Users

## Question

How does a blueprint card record which parser produced it, and what happens on
upgrade when a user's 2.1.0 regex-derived baseline meets a 2.2.0 AST-derived scan?

## Why this exists

**This is an upgrade-path hole the 2.1.0 ticket did not cover.** Old ticket 06
required re-baselining the *E2E test fixtures*, but said nothing about the
baselines sitting in real users' memory stores.

The blueprint/diff baseline has no field recording which parser produced it
(`src/scanner/diff.ts`). Ticket `02` deliberately changes what symbols get
extracted — dropping call-site noise, capturing multi-line signatures. So the
first `neuron scan --diff` after upgrading will compare a regex baseline against
an AST scan and manufacture **phantom drift across all four buckets**. Every
existing user hits this. `--check` is a CI gate for some of them, so it fails
their builds.

## Scope

1. Record parser fidelity **per file** in the blueprint card: `ast` or `regex`.
   Per-file, not per-scan — a single scan legitimately mixes both when some
   grammars are absent.
2. Implement the settled missing-grammar behaviour: **degrade to regex, warn
   loudly on stderr, label the fidelity.** The scan proceeds; the card tells the
   truth about how it was produced.
3. Teach `src/scanner/diff.ts` to detect fidelity mismatch between baseline and
   current scan, and to emit a **"re-baseline required"** result rather than a
   drift report. A mismatch is not drift — it is an incomparable measurement.
4. Give the user a first-class way through it: a documented re-baseline path, and
   an explicit message naming the command rather than a bare warning.
5. Decide and document `--check` behaviour on mismatch. Failing CI with phantom
   drift is wrong; silently passing is also wrong. A distinct exit code is the
   likely answer.
6. Re-baseline `test/e2e/fixtures/` — Pillar 4 of the E2E suite needs a fresh
   baseline once symbol extraction moves.

## Constraints

- Existing baselines carry **no** fidelity field. Absence of the field must be
  read as `regex` (a 2.1.0-era card), not as unknown.
- The fingerprint guard (`computeProjectFingerprint`, `diff.ts:357`) interacts
  with this — confirm a fidelity change invalidates the reconciled fingerprint.

## Deliverables

- [x] Per-file `parser` fidelity field in the blueprint card
- [x] Regex degradation path with a loud stderr warning
- [x] Fidelity-mismatch detection in `diff.ts` emitting "re-baseline required"
- [x] Documented re-baseline path + `--check` exit-code decision
- [x] Re-baselined E2E drift fixtures (Pillar 4) — see note below
- [x] Upgrade note in CHANGELOG for 2.1.0 → 2.2.0 users

## Answer

A card now records the parser that produced it, and a diff across a parser change
is refused rather than reported. Fidelity logic lives in a new
`src/scanner/fidelity.ts`; decision recorded in
[ADR 0009](../../../docs/adr/0009-parser-fidelity-and-baseline-comparability.md).

Verified end-to-end on this repository, whose stored card was a genuine 2.1.0
artefact:

```
$ neuron scan --check    → exit 2, "Re-baseline Required" (regex/1 vs ast/2)
$ neuron scan            → re-baselined
$ neuron scan --check    → exit 0, "In Sync"
```

### The four decisions taken in the grilling

1. **Fidelity is versioned**: `<parser>/<generation>`, e.g. `ast/2`. The
   generation is bumped whenever extraction changes shape — **including the regex
   fallback**, which 02 also changed by dropping the bare-`name(args)` heuristic.
   So this is not "regex vs AST": two regex cards from different neuron versions
   are incomparable too, and a legacy card reads as `regex/1`. Recording only
   `ast`/`regex` would have solved this migration and left the next one unsolved.
2. **Default plus exceptions** on the card, not a label per component line. The
   card is vector-indexed, so repeating `Parser: ast` on 70 lines dilutes the
   embedding. A bare card-level `mixed` was rejected as provably insufficient —
   mixed-because-Go and mixed-because-Rust would compare equal — so comparison
   includes the exception map, not just the default.
3. **Refusal is all-or-nothing.** Cost accepted knowingly: one grammar failing to
   fetch refuses the whole diff, and repeated re-baselines absorb real drift.
4. **`--check` exits 2** on incomparable, distinct from 1 for drift.

### The two paths diverge deliberately

- **Explicit** (`--diff`/`--check`): reports the refusal, names `neuron scan`,
  exits 2.
- **Implicit** (auto-rescan behind `memory query`): re-baselines **silently**.
  Requested during the grilling: no new announcement. Implemented as no output at
  all, because reusing the drift or missing-baseline message would state
  something untrue.

### Constraint 2: the fingerprint interaction, and why it is untouched

`computeProjectFingerprint` hashes `depth`, `category` and per-file
`path:mtime:size` — **no parser identity**. So upgrading neuron without touching a
file leaves the fingerprint unchanged and the implicit re-scan is skipped
entirely. The ticket's premise that "the first `scan --diff` after upgrading"
surfaces this holds only for the explicit path.

Adding parser identity to the hash was considered and **declined**: it forces a
full re-scan of every project on every upgrade, and the blindness it avoids lasts
only until the next source edit — minutes in an active repo, not weeks. So the
migration surfaces on the next explicit `--diff`/`--check`, or on the next
implicit rescan after any edit.

### Deliverable 5, honestly

The E2E fixtures needed **no** re-baselining. Pillar 4 calls `ingestScanResults`
at the top of the test and diffs against what it just wrote, so it self-baselines
and passed unchanged. The committed
`test/e2e/fixtures/polyglot-monorepo/.neuron/architecture.md` has no fidelity
section, but nothing diffs against it — only ticket 02's test reads that fixture,
and it reads the source files, not the card. Ticking the box because the
requirement is satisfied, not because a re-baseline was performed.

### Verification

- **227 unit tests across 33 files green** (212 before this ticket, +15 here).
- **All 6 E2E pillars pass**, including Pillar 4 (Architectural Drift Detection),
  run in full at 76s.
- Built TDD across the five confirmed seams plus one added for scope item 2
  (`scanProjectTopology`, for the degradation warning). Every slice was red
  before green.
- Three pre-existing tests began failing mid-implementation and were **correct
  failures**: they diffed against the legacy fixture, which the new rule refuses.
  Fixed by adding a `comparableBaselineMarkdown` fixture so drift tests keep
  testing drift rather than the migration.

### Incidental fixes

- Removed the dead `neuron scan --force` flag (ticket comment below).
- `SCAN_HELP` still claimed "symbol extraction is line-oriented pattern matching,
  not full AST parsing" — untrue since 02. Corrected, and exit codes documented.
- Four glossary terms added to `CONTEXT.md`: *parser fidelity*, *scanner
  generation*, *incomparable baseline*, *re-baseline*.

### Notes for whoever picks up the next ticket

- `SCANNER_GENERATION` in `src/scanner/fidelity.ts` must be bumped whenever
  extraction changes shape. Forgetting reintroduces phantom drift; bumping
  needlessly forces every user to re-baseline. It cannot be derived.
- `tsconfig.json` **excludes `src/**/*.test.ts`**, so `tsc --noEmit` does not
  typecheck test files. Test fixtures can and do omit required `ScanResult`
  fields without error.
- `test/e2e/benchmark-suite.test.ts` contains literal `\x00\x01` bytes as
  corruption-pillar fixture data, so `file` reports it as binary and plain `grep`
  silently skips it. Use `grep -a`.

## Comments

- 2026-07-31: Surfaced during charting by reading `src/scanner/diff.ts` — not
  present in 2.1.0 ticket 06.
- 2026-08-01: Removed the dead `neuron scan --force` flag while in here. It was
  documented in `SCAN_HELP` as "bypass the content cache and force a full
  re-scan" and passed from `scan.ts`, but `ingestScanResults` never read it — a
  documented promise that did nothing. Removed from all three places plus the
  README. `neuron sync --force` is a different, working flag and was untouched.
- 2026-08-01: Resolved. `src/scanner/fidelity.ts` created; card gains a
  `## 🔬 Parser Fidelity` section; `diff.ts` refuses incomparable baselines;
  `--check` exits 2; ADR 0009 landed. 227 unit tests + all 6 E2E pillars green.
  This repo re-baselined — the migration ticket 02 deferred is now closed out.
