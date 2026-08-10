Type: task
Status: resolved
Blocked by: 06
Band: context cost

# 07 — Measure Whether the Discovery-Command Hint Gets Used

## Question

Ticket 32 injects a conditional, per-turn, ready-to-run discovery command
whenever the existing recall left real matches un-injected. Whether an
agent shown that hint actually invokes it — and whether doing so changes
task outcomes for the better — is an unverified behavioral assumption, not
a given: ticket 10's own counterfactual A/B found the memory arm's failure
rate *higher* than the no-memory control's, on this same map. Cheap to
build is not the same as cheap to get right.

Design and run a real measurement, at minimum establishing:
- Does a turn that received the hint get followed by the agent actually
  running the suggested command (or a close variant), versus ignoring it?
- Does a session with the hint available produce better outcomes than one
  without it, on a task that genuinely depends on discovering more than
  what the initial recall surfaced (e.g. a README/summary-writing task
  spanning many history/decisions entries)?
- Whether it's cheaper to reuse `10`/`14`/`18`'s existing harness
  (`benchmarks/token-ab/`) than build a new one, and if so, what task(s)
  from that harness (or a new one) actually exercise the "recall left a
  real gap" trigger condition at all — a task where the top-10 already
  covers everything never fires the hint and can't measure anything.

## Comments

- Graduated 2026-08-09 alongside ticket 32, in the same grilling session,
  at the maintainer's direct request — matching this map's established
  precedent of splitting proof-of-value from the build ticket rather than
  asserting it (ticket 11 → 24 for the architecture card, ticket 17 → 18
  for supersession).

## Answer

**Scope check with the maintainer, 2026-08-10.** This ticket's three
sub-questions span a cheap, real, ongoing measurement (does the hint get
followed?) and an expensive one (does it change outcomes?), the latter
requiring `benchmarks/token-ab/`'s scripted harness — real money against a
separate Anthropic Console balance. The map's own fog already flags that
exact funding/execution question as unresolved and blocking ticket 05
(architecture-card-ab), with a prior session's precedent of stopping to get
the maintainer's call before spending anything there. Asked the same
question here rather than assume an answer; the maintainer chose **free
dogfooding instrumentation first**, deferring the paid outcome-quality run.
This resolves the first sub-question (hint-follow behavior) for real, and
leaves the second (outcome quality) as open fog, explicitly not answered by
this ticket — see the map's fog entry.

**What was built** — a zero-cost, passive, ongoing measurement, not a
one-shot report:

- `src/harnesses/hintFollowLog.ts`: an append-only log
  (`hint-events.jsonl`, in the same OS cache dir as the session ledger) of
  two independent event types — `fired` (the ticket-06 hint actually
  injected this turn, with its exact suggested command) and `query-run` (a
  `Bash` tool call matched an actual `neuron memory query` invocation).
  Deliberately append-only and joined later by analysis, not a single
  record mutated in place, so a `pre-prompt` hook and a `post-tool-use`
  hook writing concurrently never race.
- `src/commands/hook.ts`: the `pre-prompt` path now calls
  `recordHintFired` whenever `buildDiscoveryHint` returns a hint (session-scoped
  branch only — the sessionless branch has no ledger to join against
  either, for the same pre-existing reason). A new `post-tool-use` point
  reads `session_id` / `tool_name` / `tool_input.command` from stdin and
  calls `recordToolUse`. **Deliberately not a `LifecyclePoint`** — no
  `HarnessAdapter` capability contract, no `install()`/`uninstall()`/
  `verify()` support, no firing-evidence tracking. Adding those would mean
  researching and committing to PostToolUse's documented shape across all
  four harnesses (Codex/Copilot/Cursor), which is real scope this
  measurement doesn't need: only this repo dogfoods itself, so only Claude
  Code needs it.
- This repo's own `.claude/settings.json` registers the `PostToolUse`
  entry (matcher `Bash`) by hand — `neuron init`'s adapters never touch
  it, since `post-tool-use` isn't in `LIFECYCLE_POINTS`. **Anyone who runs
  `neuron init` again on this repo, or hand-edits this file, should know
  the entry won't be managed or removed automatically** — it has to be
  edited by hand too.
- `benchmarks/hint-follow/analyze.mjs` (`npm run bench:hint-follow`):
  joins `fired` and `query-run` rows by session id + exact command,
  reports fired/followed/unfollowed counts, follow rate, and median
  time-to-follow. Zero API cost — reads only what real dogfooding sessions
  already recorded.

**Two real bugs found and fixed during live smoke testing** — this repo's
self-referential nature (a memory tool whose own commits and memory entries
routinely *talk about* its own commands) turned out to be a genuine hazard
for a naive text-matching measurement:

1. The first `QUERY_COMMAND_PATTERN` was a bare substring test
   (`/neuron\s+memory\s+query/`). Firing a hint and piping a synthetic
   `post-tool-use` event to validate the wiring surfaced a false positive:
   the *smoke-test command itself* (an `echo '{"command":"neuron memory
   query ..."}' | neuron hook ...` one-liner) got logged as a genuine
   `query-run`, because the phrase appeared inside its own echoed JSON, not
   because it invoked the command. Fixed by requiring the match to sit at
   the start of the command or immediately after a shell separator (`;`,
   `&`, `|`, a subshell's `(` or backtick, or a newline).
2. That fix wasn't enough on its own: recording this very fix as a
   `neuron memory add --category learning "..."` entry (content describing
   the bug, which itself mentioned `cd /repo && neuron memory query ...` as
   a worked example) tripped the *same* false positive again — the
   separator anchor matched inside the quoted `--category learning`
   argument, not at the shell's top level. Fixed by adding
   `isInsideQuotes()`, a lightweight quote-parity scan (not a full shell
   tokenizer) that walks the command up to each candidate match and rejects
   any match found inside a `'...'` or `"..."` region; `recordToolUse` now
   iterates every match via the pattern's `g` flag rather than stopping at
   the first, since an earlier match can be the false positive while a
   later one is real.

Regression-tested for both (`hintFollowLog.test.ts`): the exact
false-positive commands now record nothing; a real chained invocation
(`cd /repo && neuron memory query ...`) still matches. The manufactured
smoke-test rows (including both false positives) were deleted from the real
log before finishing, so they don't contaminate the first real data.

**Verified working end-to-end** against this repo's real store (not just
the test sandbox): fired a real hint via `neuron hook claude-code
pre-prompt`, fed the exact suggested command back through `neuron hook
claude-code post-tool-use`, and `analyze.mjs` correctly reported one fired
hint, one follow, 100% follow rate. 623 tests pass (9 new in
`hintFollowLog.test.ts`, 3 new in `hook.test.ts`); `tsc --noEmit` clean.

**Status at close: the instrument is live but the data set is empty.**
This session's own dogfooding (claiming and resolving this very ticket)
happened *before* the `PostToolUse` hook existed, so it left no rows — the
mechanism starts collecting from the next real Claude Code session in this
repo onward. `npm run bench:hint-follow` reports "No hint-follow events
recorded yet" honestly rather than fabricating a result. This is
consistent with the ticket's own type (`task`): the answer records what was
done and the facts it depends on, not a statistically powered conclusion
that doesn't exist yet.

**What remains open** (moved to the map's fog, not closed here):
- The outcome-quality sub-question (does a session with the hint actually
  do *better*?) needs the paid `benchmarks/token-ab/` harness, gated on the
  same funding/execution-path decision already blocking ticket 05.
- Once the passive log accumulates enough real sessions, someone should
  read `npm run bench:hint-follow`'s output and decide whether the
  follow-rate signal is strong/weak enough to retire this instrument, feed
  the outcome-quality run, or prompt a redesign of the hint itself.
