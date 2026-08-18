# `benchmarks/rule-recall-ab` — read-side rule-adherence A/B

Ticket 7, Map — MCP Server & Setup/Onboarding Skill Split: for Claude Code,
is an agent at least as likely to follow a behavioral rule when neuron
delivers it as when the same rule sits as static CLAUDE.md prose alone?
Raised while grilling Ticket 2 (Onboarding-Migration) — if that ticket's
migration flow moves rule content out of CLAUDE.md into neuron's store, this
is the evidence backing the premise that doing so doesn't cost adherence.

This is **read-side adherence**, not write compliance (`write-compliance-ab`
measures whether the agent calls `neuron memory add`) or hint-following
(`hint-follow` measures whether a fired discovery hint gets queried). The
rule under test here is an ordinary project convention — "comment every new
function" — deliberately unrelated to neuron's own protocol, so nothing
about solving the task forces compliance either way.

Three arms, same rule, same task, same model (Claude Sonnet 5, manual
tool-use loop in `session.mjs`, adapted from `write-compliance-ab/session.mjs`):

| arm | delivery | what changes structurally |
| --- | --- | --- |
| `control` | rule stated once in the system prompt | no `neuron.yaml`, no `neuron` on PATH — models "neuron absent" |
| `neuron-hook` | rule re-injected into context every turn | simulates ADR 0014's real per-turn pre-prompt hook — the harness injects it, the agent never chooses to |
| `neuron-mcp` | rule NOT in the system prompt at all | agent gets an extra `neuron_recall` tool (real input/output shape from `src/commands/mcp.ts`); compliance depends on it choosing to call the tool |

Reuses `write-compliance-ab/tasksHard.mjs`'s two multi-step tasks unmodified
(`stats-multi-step`, `text-multi-step`) — each already has a real fix, a new
function, a lint pass, and a changelog line across several turns, which is
the "genuine competing work" shape ticket 7's own Design section asks for.

Grading is deterministic, not an LLM judge: `grading.mjs`'s
`newFunctionHasComment` checks the **final file state** for a `//` comment
directly above the new function's definition (`sum` in `stats.mjs`,
`wordCount` in `text.mjs`) — the new function only, since the rule doesn't
retroactively bind pre-existing code. Task-solved (`fixtures.mjs`'s
`taskPasses`) is a validity filter, not the outcome measure, same
convention as `write-compliance-ab`.

## Prerequisites

1. **This repo built**: `npm run build` — fixtures shell out to this repo's
   own `dist/cli.js` directly, both for the `.bin/neuron` wrapper the agent
   sees and for seeding the `conventions` category / the `neuron_recall`
   tool handler's own query call.
2. **Anthropic credentials** for any non-dry-run: `ANTHROPIC_API_KEY` in the
   environment, or an `ant` CLI OAuth profile.
3. **Real money** for any non-dry-run — see Budget below.

## Quick start

```bash
# Free. Validates fixtures (both arms of neuron-presence) and grading end to end.
node benchmarks/rule-recall-ab/run.mjs --dry-run

# Costs money. Default pilot: 1 task x 3 arms x k=2 = 6 sessions.
node benchmarks/rule-recall-ab/run.mjs

# The full design ticket 7 describes: both tasks, k=5 = 30 sessions.
node benchmarks/rule-recall-ab/run.mjs --k=5 --tasks=stats-multi-step,text-multi-step --cap=2
```

## Budget

No live run has been captured yet — the estimate below is **extrapolated**,
not measured, from `write-compliance-ab`'s hard-mode run: same session
shape (multi-step, full-length system note, `session.mjs`-style manual
tool-use loop), same model (Claude Sonnet 5), same effort (`low`). That run
observed **$1.56 for 30 sessions** (~$0.05/session average, up to
**$0.25** for an outlier session that hit a retry loop).

| run | sessions | extrapolated cost | default `--cap` |
| --- | --- | --- | --- |
| default pilot (`--k=2`, 1 task) | 6 | **~$0.20-$0.40**, worst case ~$1.50 if every session hit the outlier rate | `$1` |
| full design (`--k=5`, both tasks) | 30 | **~$1.50-$2.00** | pass `--cap=2` explicitly |

The default `--cap=1` is a **hard stop**, not an estimate — `run.mjs` skips
any remaining planned session once cumulative spend crosses it, same
mechanism as `write-compliance-ab`'s `--cap`. Always run `--dry-run` first;
it costs nothing and validates both fixture variants (`control`'s
neuron-absent state and `neuron-hook`/`neuron-mcp`'s seeded store) end to
end before spending anything real.

Concurrency defaults to 1 (not higher) so the `--cap` check between
sessions stays exact, matching `token-ab`/`write-compliance-ab`'s own
precedent.

## Decision rule (from ticket 7's own Design)

No fixed numeric bar set in advance. Read the compliance-rate margin
(`neuron-hook`/`neuron-mcp` vs. `control`) against the sample size in the
printed scorecard and `results.json`. This ticket's result is
**non-blocking** — it feeds documentation/positioning claims but does not
gate Tickets 4/5's already-shipped implementation. The `neuron-mcp` arm
also reports `recall-called` (did the agent even invoke the tool) as
separate telemetry from the compliance outcome — a low compliance rate
with a low recall-called rate means the agent never looked, which is a
different finding from looking and still not complying.

## Flags

- `--dry-run` — no API calls, validates fixtures + grading only
- `--k=<n>` — repeats per (task, arm) pair (default `2`)
- `--tasks=<id,id>` — filter to specific `tasksHard.mjs` task ids (default `stats-multi-step`)
- `--cap=<usd>` — hard spend cap; skips remaining sessions once crossed (default `1`)
- `--concurrency=<n>` — parallel sessions (default `1`)
- `--effort=<level>` — passed through to `output_config.effort` (default `low`)
- `--out=<name>` — output subdirectory name under `results/7-rule-recall-ab/` (default `pilot`); dry runs always get a `-dry-run` suffix so they can never collide with a live run's artifact
