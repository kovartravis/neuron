Type: research
Status: unclaimed
Blocked by: none
Band: 2.2.0-rc3

# 10 — Harness Compatibility Research: Injection Surfaces Across Five Agents

## Question

What can each of Claude Code, Codex, GitHub Copilot CLI, Antigravity CLI and
OpenCode *actually* do to inject context automatically — and which of them can do
it **deterministically**, without the agent choosing to cooperate?

## Why this is the first recall ticket

The whole recall theme rests on one distinction:

- **Instruction-based recall** — a `CLAUDE.md`/`AGENTS.md` block asking the agent
  to run `neuron memory query`. The agent may skip it. This is what neuron ships
  today, and it is what 2.2.0 is trying to escape.
- **Harness-enforced recall** — the harness executes the query and injects the
  result regardless of what the agent decides.

An MCP server does **not** cross that line: it exposes tools the agent chooses to
call, which is the same failure relocated. This is why MCP is out of scope.

These five harnesses are **not equivalent** on this axis. Claude Code has
pre-prompt injection; OpenCode has a plugin/event system; Copilot CLI's
extensibility is considerably thinner. The adapter layer in ticket `11` must model
that difference honestly rather than abstract it away — otherwise 2.2.0 ships the
same unreliability behind a nicer interface. This research is what makes honesty
possible.

## Investigate, per harness

1. **Config surface** — where does per-project and per-user config live, what
   format, and is it safe for `neuron init` to write into?
2. **Event/hook model** — which lifecycle points exist? Specifically: session
   start, pre-prompt, pre-tool-use, post-tool-use, session end.
3. **Injection capability** — can a hook return text that lands in the model's
   context, or only produce side effects? This is the decisive question.
4. **Determinism** — does the harness *guarantee* execution, or is it advisory?
5. **Failure behaviour** — if the hook command errors, times out, or is slow,
   does the harness block, warn, or continue silently? Auto-injection on every
   turn makes a slow hook a user-visible stall.
6. **Payload limits** — size caps on injected context, and truncation behaviour.
7. **Verifiability** — can neuron confirm from the outside that its hook is
   actually wired and firing? Ticket `19` needs this to report honestly.

## Output

A markdown asset at `.scratch/neuron-2.2.0/research/harness-compatibility.md`
containing a per-harness table with a **fidelity verdict** for each:
`deterministic` / `best-effort` / `instruction-only`. Cite primary sources —
official docs and source, not blog posts. Where a capability is undocumented but
observable, say so and mark the confidence.

State plainly where a harness cannot support deterministic recall. A finding that
only two of five can do it is a **useful** result — it shapes `11`'s architecture
and `19`'s honesty — not a failed investigation.

## Deliverables

- [ ] `research/harness-compatibility.md` with per-harness fidelity verdicts
- [ ] Config file path + format per harness
- [ ] Lifecycle event inventory per harness
- [ ] Failure and payload-limit behaviour per harness
- [ ] Explicit list of which harnesses fall back to `AGENTS.md`

## Comments

- 2026-07-31: **AFK and unblocked from day one.** Does not depend on tree-sitter
  and can run in parallel with rc1 rather than idling until rc3 begins.
