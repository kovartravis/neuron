Type: task
Status: resolved
Blocked by: none
Band: dogfooding feedback (travisos)

# 19 — Non-Interactive Write Mode for Scheduled/Cron Writers

## Question

Add a non-interactive `neuron memory add` mode for scheduled jobs (cron,
CI) that cannot answer the supersession gate's interactive
prompt-and-retry flow. Today a near-duplicate write hard-errors
(`src/commands/memory.ts:94-105`) asking the caller to re-run with either
`--supersedes <id>` or `--not-a-reversal` — a human loop, not something a
scheduled job can complete. Candidate shapes named in the field feedback:
an `--if-novel` flag that silently skips the write when a near-duplicate
is found (job succeeds, entry not added), or a `neuron exec --no-history`
mode. Pick one (or a distinct third shape) and implement it.

## Context

Reported 2026-08-10 via dogfood feedback from `travisos`: "scheduled jobs
are the main duplicate source, and prompt wording alone won't reliably
hold." The gate itself (`findSupersessionCandidate`,
`SUPERSESSION_SIMILARITY_THRESHOLD = 0.97` at `src/index.ts:1644`) is
working as designed for an interactive caller — this ticket is about
giving a non-interactive caller a way to resolve the same gate without a
human present, not about changing the gate's detection logic.

## Scope

- Decide the flag/mode shape and its exact semantics on a gate hit: skip
  silently (exit 0, no write, note in output it was skipped) vs. skip with
  a warning on stderr vs. some other resolution. A silent skip that leaves
  no trace risks masking real duplicate-prevention failures the same way
  the current bug batch's item 6 (sessionsObserved) argues visibility
  matters — favor a mode that skips the write but still says so.
- Wire it through `src/commands/memory.ts`'s `add` handler alongside the
  existing `--supersedes`/`--not-a-reversal` branch (~lines 87-106).
- Document the new mode in `getMemoryHelp` (`src/commands/utils.ts`) and
  wherever cron/scheduled usage is documented for adopters.

## Answer

Chose the `--if-novel` flag shape over `neuron exec --no-history`: the gate
lives in `memory add`, not `exec`, and a flag on the command that actually
hits the gate keeps the resolution mechanism next to the thing it resolves
rather than introducing a second command surface.

Semantics on a gate hit, per the Scope's own steer toward visibility over a
fully silent skip: the write is skipped (no entry added, job still succeeds
— `process.exit(0)`), but never silently. The candidate id and similarity
are printed to stderr (`[neuron] skipped: ...`), and the JSON normally
printed to stdout on a successful write is replaced with
`{"skipped": true, "reason": "supersession-candidate", "candidateId": ...,
"similarity": ...}` — a scripted caller can tell a skip from a real write
by shape, not just by re-parsing stderr prose. When `--if-novel` is set but
no candidate is found, the write proceeds exactly as an ordinary `add`
would; the flag only changes behavior at the gate, never the write path
itself.

`--if-novel` is mutually exclusive with `--supersedes` and
`--not-a-reversal` (enforced in `parseFlags`, same place the existing
`--supersedes`/`--not-a-reversal` exclusivity lives) — those two assert a
human already made the call; `--if-novel` is the opposite posture, deferring
to the gate because no human is present to ask.

Implementation: `src/commands/utils.ts` (`--if-novel` parsing,
`RESERVED_FLAG_NAMES` in `src/config/neuronYaml.ts`, `MEMORY_HELP` text),
`src/commands/memory.ts`'s `add` handler (the skip branch, inserted ahead of
the existing hard-error branch inside the same `if (candidate)` check).
Documented in `neuron memory --help` and a new README "Scheduled and cron
writers" section (Scope's "wherever cron/scheduled usage is documented" had
no existing target to update — nothing in this repo documented cron usage
before this ticket). Four new tests in
`memory.supersession.test.ts` (skip-and-exit-0 with stderr/JSON shape
assertions, no-candidate passthrough, both mutual-exclusivity rejections).
`npm test` 653/653 (was 649), `tsc` clean.

## Comments

- Chartered 2026-08-10 from the same dogfooding feedback batch as
  [18](18-fix-concurrent-write-data-loss.md),
  [20](20-ship-neuron-doctor.md), and
  [21](21-warn-on-zero-sessions-observed.md).
