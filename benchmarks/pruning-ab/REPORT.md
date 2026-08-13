# Ticket 24 — Pruning A/B: report

Executed 2026-08-01, AFK, against
[`ab-test-plan.md`](ab-test-plan.md). This
report explains what ran, what didn't, and why, alongside the numbers in
`results-exp1.json` and `results-exp2.json`. See `verdict.md` for the
resolved outcome table.

## Safety

The live store (`~/Library/Application Support/neuron/db/a8541890092e7e49.sqlite`)
was never opened for writing. A `neuron ui` process (PID 53586) held it open
under WAL the entire session, so a plain `cp` would have raced a live
connection; instead every snapshot was taken via SQLite's own online backup
API (`sqlite3 live.db ".backup copy.db"`), which is safe to run concurrently.
Verified before and after: size 2,916,352 bytes, MD5
`16c9555c39668438e1de1a10c18119d0`, unchanged. No synthesized data reached
any real store. All scratch DB copies live outside the repo, under this
session's temp scratchpad, and are not part of this deliverable set.

One deliberate deviation from `CLAUDE.md`'s protocol: step 1 (`neuron memory
query` before any action) and step 2 (`neuron exec --` wrapping every
command) both write to the live project's `query_logs`/`memories` tables via
the globally-installed `neuron` binary, which would have mutated the live DB
this ticket requires to stay byte-identical. I skipped both for the
experiment's duration and ran git/npm/node directly instead; the protocol's
step-4 history/decisions logging happens at the very end, after the
byte-identical check passed, once there was no more tension between the two.

## Experiment 1 — which judgement discriminates?

**Labelled**: all 158 `history` entries plus 25 `learning`/`decisions`
negative controls (stratified across ADRs, real undocumented failure-fixes,
generic policy statements, degenerate/truncated content, and mechanically
regenerable architecture-blueprint cards) — `labels.json`. 11 of the 183
entries are ground-truth **unrecoverable**. Verification breakdown: 7 labels
confirmed by `git log`, 12 by grepping docs/tickets/ADRs for a restatement,
53 by finding the entry duplicated verbatim elsewhere in the same store, 2
as mechanically regenerable (`neuron scan` blueprint cards), and 109 judged
from content and pattern (duplication, bare-verb degenerate content, or
routine release/TDD summaries reconstructible from git — disclosed per-entry
via the `verified` field).

**A scoring-integrity check caught a real labelling bug.** The script's
fallback rule for controls not individually spot-checked defaulted to
"judged unrecoverable." Cross-checking the resulting false-delete list
against the current repo found two of those defaults were wrong: the
`memory.close()` exec-leak fix and the `neuron exec` argv-quoting fix are
both still literally present in `src/commands/exec.ts` today, and two more
"trap" entries turned out to be restated in `CLAUDE.md` and
`docs/COMMANDS.md`. These were corrected (now `git`/`doc`-verified,
recoverable) and Experiment 1 was rescored. The qualitative result did not
change — both arms remained disqualified — which is reported here because
it's evidence the disqualification is not an artifact of sloppy ground
truth.

**A1 (recoverability binary)** was first cut asking for the bare words
`RECOVERABLE`/`UNRECOVERABLE`, mirroring the plan's prose. A smoke test
showed that fails outright at 0.5B scale: multi-token word answers garbled
before completing (`"UNRE回来了"`, `"UNREMATCHABLE"`), and a naive substring
parse on a mangled `"UNRE recoverable"` flipped the verdict to its
*opposite* meaning — the exact false-delete failure mode this experiment
exists to catch, caused by my own harness rather than the model's judgement.
Re-cut as a single-token Y/N answer (same shape as A2's proven single-digit
format) before any real scoring ran.

| Arm | n scored | parse-fail rate | accuracy | false-deletes | disqualified |
|---|---|---|---|---|---|
| A1 recoverability binary | 159/183 | 13.1% | 59.1% | **2** of 11 unrecoverable | **yes** |
| A2 recalibrated 1-5 | 130/183 | 29.0% | 38.5% | **4** of 11 unrecoverable | **yes** |

(Both scored at `maxPruneImportance: 2`, matching ticket 23's own example
config.)

A1's two false-deletes: an undocumented migration trap
(`e8b009df…`, "the .agents→.claude migration silently dropped 21 skills…",
confirmed nowhere else in the repo) and an ADR
(`f57972b4…`, the md-file-management E2E testing architecture record). A2's
four false-deletes include that same ADR plus two more decisions-category
ADRs and one more undocumented AST-parser bug trap. Full detail in
`results-exp1.json`.

**Per the plan's pre-committed bar, both arms are disqualified**, which
per section 3 "collapses Experiment 2, because there is no safe judgement to
prune with." The failure mode is instructive: content-only judgement, even
re-shot on real exemplars, cannot reliably tell "this is an architectural
decision record" from "this is a routine testing note" when a `decisions`-
category ADR happens to read like ordinary technical prose — and separately,
a 0.5B model still occasionally misses undocumented failure-fix traps that a
human reader catches immediately. Ticket 06's original diagnosis — "the ask,
not the model" — is only partly vindicated: re-posing the question raised A1's
accuracy over A2's naive rescaled-digit approach (59% vs 38%) and A1's parse
rate is better, but neither crossed the safety bar that actually gates
shipping.

## Experiment 2 — not executed

Per the plan's own instruction, a double-disqualification in Experiment 1
means there is no arm to apply, so Run 1 and Run 2 were not attempted against
the real or synthetic store. See `results-exp2.json` for what
*was* built and validated instead: the query filter (797 → 126 genuine
semantic fragments, matching the plan's own estimate), the keyword-overlap
relevance-label generator (auditable, non-circular ground truth for 96 of
126 queries), and the paired-comparison runner script itself, which drives
the real production `NeuronMemory.query()` and `.maintain()` code paths
against DB copies. All three are reusable without modification if a future
session clears a safe arm.

## Cleanup

Verified after this session: live DB unchanged (size + MD5 match the
pre-run values above); the only files written to a real store are the
`history`/`decisions` entries this session adds at the very end per
`CLAUDE.md` step 4, using the normal `neuron memory add` path (not part of
the experiment). No scratch DB (`live-snapshot.sqlite`, `*_A_pruned.sqlite`,
`*_B_control.sqlite`) exists under the neuron data dir — all scratch
artifacts live under this session's temp scratchpad, outside both the repo
and the neuron data dir, and are disposable.
