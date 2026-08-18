# Rule-recall A/B findings — Ticket 7, Map — MCP Server & Setup/Onboarding Skill Split

**Date:** 2026-08-17
**Ticket:** 7 — A/B: Does Neuron-Delivered Rule-Following Match or Beat Static
CLAUDE.md, on Claude Code?
**Harness:** `benchmarks/rule-recall-ab/` — `session.mjs`, `fixtures.mjs`,
`grading.mjs` shared across four orchestrators (`run.mjs`, `run-hard.mjs`,
`run-action.mjs`, `run-trigger.mjs`), each testing a different rule design
against the same three arms. Raw results under
`benchmarks/rule-recall-ab/results/7-rule-recall-ab/{pilot,hard,action,trigger}/results.json`.
Budget: **$0.62 total** across all four live runs, against the maintainer's
self-imposed $2 cap for this investigation — stopped by explicit maintainer
call after the fourth attempt, not by hitting the cap.

---

## TL;DR

Two findings, of very different strength.

1. **`neuron-mcp` (agent-invoked recall via a `neuron_recall` tool):
   consistently 0% compliance, replicated across four independent rule
   designs, 8/8 sessions.** The tool was called in only 5 of 8 sessions
   (62.5%) — and even when called, never once produced compliant output.
   This is the strongest, most reproducible result in the whole
   investigation.
2. **`control` vs. `neuron-hook` (static prose vs. neuron's real per-turn
   hook): inconclusive.** `control` hit 100% compliance in all four designs
   (8/8 sessions) — a ceiling effect that never broke, so no delivery
   mechanism could show a margin over it. The root cause is understood (see
   below), and it's a harness-shape problem, not evidence that the hook
   doesn't help in practice.

**For the premise this ticket exists to test** — "does moving rule content
out of CLAUDE.md into neuron cost adherence?" — the honest answer is: no
evidence neuron's per-turn hook *costs* adherence (it tied `control` in
every attempt), but also no evidence yet that it *improves* it, because the
harness never managed to make `control` fail. The one clear, load-bearing
risk this investigation did surface: an MCP-tool-only delivery path (no
hook backing it) risks real under-compliance, since it depends on the agent
voluntarily choosing to look.

## Setup common to all four runs

- **Model:** Claude Sonnet 5, manual tool-use loop (`session.mjs`, adapted
  from `write-compliance-ab/session.mjs`), `effort=low`.
- **Task:** `stats-multi-step`, reused unmodified from
  `write-compliance-ab/tasksHard.mjs` — fix a real bug, add a new function
  against an existing test, pass a lint check, write a changelog line.
- **Repeats:** k=2 per arm → 6 sessions per run, 24 sessions total across
  all four designs.
- **Three arms:**
  - `control` — no `neuron.yaml`, no `neuron` on `PATH`. Rule stated once
    in the system prompt. Models "neuron absent."
  - `neuron-hook` — same initial system-prompt content as `control`, plus
    the rule re-injected into context on every turn (`session.mjs`),
    simulating ADR 0014's real per-turn pre-prompt hook.
  - `neuron-mcp` — rule NOT in the system prompt at all. Agent gets a real
    `neuron_recall` tool (same input/output shape as the real MCP server,
    `src/commands/mcp.ts`) whose handler shells out to a genuinely seeded
    store — agent-invoked, not automatic.
- **Grading:** deterministic in every design — either a regex over final
  file content (comment/tag checks) or final-file-existence
  (`.session-log`), never an LLM judge.

## The four rule designs, and why each one changed

| run | rule shape | control | neuron-hook | neuron-mcp | cost |
| --- | --- | --- | --- | --- | --- |
| `pilot` | any `//` comment on a new function | 100% (2/2) | 100% (2/2) | 0% (0/2) | $0.1208 |
| `hard` | exact `// @behavior:` tag, buried in a 6-bullet style guide | 100% (2/2) | 100% (2/2) | 0% (0/2) | $0.1997 |
| `action` | unconditional: log every session to `.session-log` before finishing | 100% (2/2) | 100% (2/2) | 0% (0/2) | $0.1325 |
| `trigger` | conditional: log *immediately* when a failing test gets fixed | 100% (2/2) | 100% (2/2) | 0% (0/2) | $0.1670 |

- **`pilot`**: the naive first design. "Add any comment above a new
  function" turned out to be a default Sonnet 5 habit, not something that
  needs remembering — no rule delivery mechanism could show a margin over
  a habit the model already has.
- **`hard`**: applied `write-compliance-ab` ticket 5's exact two fixes
  (exact/arbitrary format instead of "any comment"; buried among unrelated
  style bullets instead of being the system note's sole content). Ceiling
  didn't break. Root cause: the Anthropic Messages API resends the full
  system prompt on every turn — a rule satisfied by "write this one line of
  code correctly" is exactly as available at turn 4 as turn 1, no matter
  how it's worded or buried. Burial dilutes salience; it doesn't remove the
  content from context the way chat history would recede.
- **`action`**: switched to an unprompted, separate action (write a
  session-log file) matching `write-compliance-ab`'s own rule *shape*.
  Still 100%. Root cause: an *unconditional* "before you finish, always do
  X" obligation lands at exactly `finish_task` — the moment a model
  naturally reviews what's left to do, the easiest possible moment to
  satisfy any pending obligation.
- **`trigger`**: fixed that by making the rule *conditional* on an earlier
  event ("when a failing test gets fixed, record it immediately") — the
  actual mechanism `write-compliance-ab`'s hard mode used (its rule fires
  on the fix, not on session end). Still 100%.

## Why the ceiling never broke, and what would actually break it

Re-reading `write-compliance-ab`'s own findings doc
(`docs/design/write-compliance/nudge-ab-findings.md`) after the fourth
attempt surfaced the real distinguishing mechanism its hard mode relies on,
which none of the four designs above reproduce: **a genuinely confusable
alternative action**. In that harness, a model can write a `history` entry
(satisfying §2 Session Conclusion) without writing the specific `learning`
"Fix for..." entry §1 demands — two plausible-looking ways to "record"
something, only one of which counts. `control` there complied in exactly
1/5 sessions per task because it frequently took the *wrong but real*
recording action, not because it forgot to record anything at all.

Every rule tested in this investigation has no such substitute: there is
nothing else in the fixture a model could plausibly mistake for "I already
satisfied the rule." (`stats-multi-step`'s own required `CHANGELOG.md` line
is the closest candidate and didn't appear to cause any confusion across
8 sessions.) Breaking the ceiling for real would need a fixture built
around a genuine confusable alternative — a structural redesign, not
another rule-wording tweak. Out of scope for this investigation; stopped
here by explicit maintainer call after the fourth attempt.

## The `neuron-mcp` finding, in detail

0% compliance held across all four independent rule designs — a result
that got *stronger*, not weaker, with replication. The tool was called in
5 of 8 sessions (62.5%); even in those 5, it never once produced a session
that satisfied the rule being tested. Two candidate explanations, neither
ruled out by this data:

- The agent simply doesn't think to check for project conventions before
  writing a small, unremarkable helper function — a discovery problem, not
  a compliance-once-discovered problem.
- Even when it did call `neuron_recall` and got the rule back
  (`recall-called=YES` sessions), something about surfacing the answer
  as tool output rather than system-prompt content failed to translate
  into the exact compliant action — worth a closer transcript read if this
  arm gets revisited, which this investigation's budget didn't allow for.

Either way, the practical implication is the same: **a delivery path that
depends entirely on voluntary tool use, with no hook backing it, is a real
adherence risk** — not a theoretical one flagged in advance by the ticket's
own Design section, but one this investigation actually observed, four
times, live.

## Recommendation for documentation/positioning claims

This ticket's own stated consumer (e.g. neuron.github.io site messaging):

- **Don't claim** the deterministic per-turn hook measurably *improves*
  compliance over static CLAUDE.md prose — that's untested, not
  disproven, given the ceiling effect this investigation couldn't break.
  It's fair to say it *doesn't cost* adherence (tied `control` in 4/4
  attempts).
- **Do flag** MCP-tool-only delivery (no hook wired) as needing either a
  stronger nudge toward calling `neuron_recall` or, wherever the harness
  supports it, default-on hook wiring rather than resting on the agent's
  own initiative — this investigation's one consistent, replicated,
  negative result.

## Assets

- `benchmarks/rule-recall-ab/` — harness source (4 modes).
- `benchmarks/rule-recall-ab/results/7-rule-recall-ab/{pilot,hard,action,trigger}/results.json` — raw results, 24 live sessions total.
