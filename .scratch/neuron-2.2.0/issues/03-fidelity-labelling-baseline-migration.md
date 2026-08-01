Type: task
Status: unclaimed
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

- [ ] Per-file `parser` fidelity field in the blueprint card
- [ ] Regex degradation path with a loud stderr warning
- [ ] Fidelity-mismatch detection in `diff.ts` emitting "re-baseline required"
- [ ] Documented re-baseline path + `--check` exit-code decision
- [ ] Re-baselined E2E drift fixtures (Pillar 4)
- [ ] Upgrade note in CHANGELOG for 2.1.0 → 2.2.0 users

## Comments

- 2026-07-31: Surfaced during charting by reading `src/scanner/diff.ts` — not
  present in 2.1.0 ticket 06.
