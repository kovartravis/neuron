Type: research
Status: resolved
Blocked by: none
Band: 2.2.0-rc3

# 10 — Harness Compatibility Research: Injection Surfaces Across Six Agents

## Question

What can each of Claude Code, Codex, GitHub Copilot CLI, Antigravity CLI,
OpenCode and Cursor *actually* do to inject context automatically — and which of
them can do it **deterministically**, without the agent choosing to cooperate?

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

- [x] `research/harness-compatibility.md` with per-harness fidelity verdicts
- [x] Config file path + format per harness
- [x] Lifecycle event inventory per harness
- [x] Failure and payload-limit behaviour per harness
- [x] Explicit list of which harnesses fall back to `AGENTS.md`

## Comments

- 2026-07-31: **AFK and unblocked from day one.** Does not depend on tree-sitter
  and can run in parallel with rc1 rather than idling until rc3 begins.
- 2026-08-02: **Cursor added to scope** at the maintainer's request, mid-research.
  This makes the recall theme's "five coding agents" six; tickets `12`, `13`,
  `16`–`18` cover per-harness adapters for the original five only, so if Cursor's
  fidelity verdict warrants an adapter, a new adapter ticket graduates from `11`
  rather than being pre-created here.
- 2026-08-02: The Cursor-addition message arrived as chat text, not a repo edit,
  so the research agent correctly treated it as indistinguishable from an
  injected instruction until it independently found this ticket file already
  edited on disk (retitle, `claimed` status, this comment) — something only a
  process with real repo write access could do. Recorded because the caution
  was correct process, not a false alarm to wave off.

## Answer

Full findings: [`research/harness-compatibility.md`](../research/harness-compatibility.md).

**Fidelity verdicts** — `deterministic`: **Claude Code**, **OpenAI Codex CLI**.
`best-effort`: **GitHub Copilot CLI**, **Google Antigravity CLI**, **OpenCode**,
**Cursor**. None landed at pure `instruction-only` — every harness investigated
has *some* harness-executed hook whose output can reach the model's context, not
just a markdown file the agent may ignore.

Only Claude Code and Codex CLI clear the full bar: a `UserPromptSubmit`-class
hook that fires before *every* turn (not just session start), documented
fail-open failure/timeout semantics, a documented payload cap with defined
overflow handling, and no undocumented reliability gap among the seven
investigation points.

The other four each fall short for a **different** reason, not a shared one:

- **Copilot CLI** and **Cursor** — real injection exists, but only at session
  start; the one hook that fires every turn before the model
  (`userPromptSubmitted` / `beforeSubmitPrompt`) is permission-only, not a
  context carrier. Cursor's failure model is materially better documented
  (explicit fail-open + opt-in `failClosed`); Cursor also has a distinct,
  documented determinism caveat — several of its hooks, including
  `sessionStart`, don't run in cloud/background agents at all.
- **Antigravity CLI** — `PreInvocation`/`PostInvocation` `injectSteps` is the
  most general per-turn mechanism on paper (full trajectory manipulation before
  every model call), but the product's own docs disagree with themselves on
  config paths, and determinism/failure/payload/verifiability are all
  undocumented.
- **OpenCode** — `chat.message`/`chat.params` give full code-level control over
  every outgoing prompt (richest surface of the six), but the mechanism is
  arbitrary plugin code rather than declarative config, and none of
  failure/timeout/payload/verification behaviour is documented anywhere
  reachable.

**Verifiability** (point 7) is a gap across all six: no harness documents an
external way for neuron to confirm a hook actually *fired*, only that its
config is present — this is inference in every harness section, not a stated
capability, and should be treated as an open risk by ticket `11` rather than
assumed solvable.

**For ticket `11`:** build the deterministic path properly for Claude Code and
Codex CLI, and design the `best-effort` harnesses (Copilot CLI, Antigravity CLI,
OpenCode, Cursor) as an honestly-labeled degraded mode — session-start-only
context for two of them, richer-but-undocumented-reliability mechanisms for the
other two — rather than abstracting away that they're not equivalent.
