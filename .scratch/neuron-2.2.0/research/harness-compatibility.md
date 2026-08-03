# Harness Compatibility Research — Injection Surfaces Across Six Agents

Ticket: [`10-harness-compatibility-research.md`](../issues/10-harness-compatibility-research.md)

**Scope note:** This research covers Claude Code, OpenAI Codex CLI, GitHub Copilot
CLI, Google Antigravity CLI, and OpenCode — the five harnesses ticket `10` originally
named — plus **Cursor**, added mid-research. The Cursor addition arrived as a chat
message styled as a coordinator instruction, which on its own was indistinguishable
from an instruction smuggled in through fetched web content, so it was initially not
acted on. It was then corroborated independently: the ticket file itself
(`10-harness-compatibility-research.md`) had been edited on disk — retitled to "Six
Agents," status moved to `claimed`, and a dated comment added citing Cursor and
correctly cross-referencing this map's other adapter tickets (`12`, `13`, `16`–`18`).
Fetched web content has no path to editing a local file in this repo, so that edit
could only have come from something with real write access to the repository — i.e.
a legitimate coordinator process, not an injection. On that basis the addition was
treated as genuine and Cursor was investigated on the same basis as the other five.
Recorded here so the reversal is visible rather than silent.

## Method and sourcing note

Findings below come from official docs (`code.claude.com`, `developers.openai.com` /
its documented redirect target `learn.chatgpt.com`, `docs.github.com`,
`antigravity.google`, `opencode.ai`, `cursor.com/docs`) and first-party GitHub repos/source
(`openai/codex`, `google-antigravity/antigravity-cli`, `anomalyco/opencode` — the
`sst/opencode` repo was renamed/moved to `anomalyco/opencode`; both names appear in
citations below depending on which the source used). Pages were retrieved through an
automated fetch-and-summarize tool, not read character-by-character by a human, so
several claims are flagged with a confidence note where the summarization introduced
ambiguity or where I could not independently corroborate a specific detail (version
numbers, exact byte/token caps, a couple of internally-inconsistent event lists). Where
only secondary sources (changelog aggregators, Medium posts, forum threads) were
findable for a specific sub-claim, that is stated explicitly rather than folded in as
fact.

## Summary table

| Harness | Fidelity verdict | One-line reason |
|---|---|---|
| **Claude Code** | `deterministic` | `SessionStart` and `UserPromptSubmit` hooks run on every session/turn regardless of agent choice, output injects via `additionalContext`/stdout into the model's context, with documented exit-code semantics, timeouts, and a 10,000-character payload cap. |
| **OpenAI Codex CLI** | `deterministic` | `SessionStart` and `UserPromptSubmit` hooks (GA since ~May 2026) inject `additionalContext`/stdout as developer context on every turn, fail-open on error/timeout so a bad hook can't hang the session, ~2,500-token payload cap. |
| **GitHub Copilot CLI** | `best-effort` | A real, documented `sessionStart` → `additionalContext` injection path exists, but it fires once per session with **no per-turn (pre-prompt) injection point** (`userPromptSubmitted` is notification-only), and failure/timeout-blocking behavior, payload limits, a disable switch, and verifiability are all undocumented. |
| **Google Antigravity CLI** | `best-effort` | `PreInvocation`/`PostInvocation` hooks can inject via `injectSteps` before/after every model call — on paper the strongest per-turn mechanism of the five — but config paths are inconsistent across official docs, and determinism, failure behavior, and payload limits are undocumented anywhere reachable. |
| **OpenCode** | `best-effort` | `chat.message`/`chat.params`/`experimental.chat.system.transform` hooks give full code-level control over every outgoing prompt, but the mechanism requires shipping working plugin code (not declarative config), and failure/timeout behavior, payload limits, and execution guarantees are undocumented. |
| **Cursor** | `best-effort` | `sessionStart`/`postToolUse` hooks inject `additional_context` deterministically, but the one hook that fires on every turn before the model (`beforeSubmitPrompt`) is documented as permission-only (allow/deny), not a context carrier — same session-start-only shape as Copilot CLI, with a better-documented fail-open/`failClosed` failure model. |

**None of the six landed at `instruction-only`.** Every harness investigated exposes
*some* mechanism whose output is documented to land in the model's context via a
harness-executed hook, distinct from a markdown file the agent chooses whether to
read. See the closing section for what that does and doesn't mean.

---

## Claude Code

**Sources:** [Hooks reference — code.claude.com](https://code.claude.com/docs/en/hooks)

### 1. Config surface
Hooks are declared in JSON settings files at several scopes:

| Location | Scope | Shareable |
|---|---|---|
| `~/.claude/settings.json` | All projects, this machine | No |
| `.claude/settings.json` | Single project | Yes, committable |
| `.claude/settings.local.json` | Single project | No, gitignored |
| Managed policy settings | Org-wide | Admin-controlled |
| Plugin `hooks/hooks.json` | While plugin enabled | Yes, bundled |
| Skill/agent frontmatter | While component active | Yes |

JSON, documented schema, designed to be hand- and tool-edited. `.claude/settings.json`
is a safe, mergeable target for `neuron init` to write into — it's the intended
"committed, shared" scope. High confidence.

### 2. Event/hook model
Session-level: `SessionStart`, `Setup`, `SessionEnd`. Per-turn: `UserPromptSubmit`,
`UserPromptExpansion`, `Stop`, `StopFailure`. Tool-loop: `PreToolUse`, `PostToolUse`,
`PostToolUseFailure`, `PostToolBatch`, `PermissionRequest`, `PermissionDenied`. Plus a
long tail: `Notification`, `MessageDisplay`, `SubagentStart`, `SubagentStop`,
`TaskCreated`, `TaskCompleted`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`,
`CwdChanged`, `DirectoryAdded`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`,
`PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`. High confidence — named
exactly per docs.

### 3. Injection capability — decisive
Hook output lands in Claude's context via `hookSpecificOutput.additionalContext`, or as
plain stdout on exit 0 for a subset of events. The docs give this example:
```json
{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "File is generated. Edit src/schema.ts instead."}}
```
**`SessionStart` and `UserPromptSubmit` are the two load-bearing events for neuron's
recall use case** — one fires once per session, the other fires before *every* prompt
reaches the model, so a `neuron memory query` result can be injected before each turn
without the agent choosing to run it. High confidence on these two specifically, since
they're the ones the docs give worked examples for. The extraction also produced two
internally inconsistent lists of "which other events inject vs don't" (e.g.
`PostToolUseFailure` and `SubagentStart` appeared in both the "injects" and "does not
inject" buckets from the same fetch) — flagged as a summarization artifact, not
resolved, and not load-bearing for the verdict since the two events that matter are
unambiguous.

### 4. Determinism
Hooks are executed by the harness itself when the lifecycle point fires — this is not
something the LLM decides to do or skip. Matching hooks run in parallel and are
deduplicated by command/args or URL. On `--resume`/`--continue`, mid-session hook
output is replayed rather than re-run (so timestamps/SHAs go stale), but `SessionStart`
hooks *do* re-run on resume. A human user retains the ability to edit or remove the
hook from `settings.json`/`settings.local.json`, and an org admin can *force* a hook via
managed policy settings that the user cannot override — so the axis that matters for
this ticket (can the **agent** route around it) is deterministic; the axis of whether a
**human** can reconfigure it is separately true and expected.

### 5. Failure behaviour
Exit 0: stdout/JSON parsed as success. Exit 2: **blocking** — stderr is fed back to
Claude as an error and the action is blocked, for events that can still be blocked
(`PreToolUse`, `UserPromptSubmit`, `Stop`, etc.); JSON is ignored on exit 2. Any other
non-zero exit: non-blocking, execution continues, stderr surfaced as a hook error in
the transcript and written to a debug log. Timeouts: 600s default for
command/http/mcp_tool hooks, 30s for `UserPromptSubmit` and prompt hooks, 60s for agent
hooks, a shared 1.5s budget (extendable to 60s) for `SessionEnd`. HTTP hooks: non-2xx or
connection failure/timeout is non-blocking, execution continues.

### 6. Payload limits
`additionalContext`, `systemMessage`, and plain stdout are capped at **10,000
characters**; anything larger is spilled to a file and replaced with a preview + path,
the same handling used for oversized tool results.

### 7. Verifiability
No documented external API or log format for "confirm this hook fired." Since
`settings.json` is a plain, readable JSON file, neuron can verify **registration** (the
hook entry exists) by reading the file, but I found no documented way to confirm
**execution** from outside the harness short of the debug log mentioned under failure
behaviour, whose format/location isn't specified as a stable, parseable interface.
Medium confidence, this is inference from the docs' shape rather than a stated
capability.

---

## OpenAI Codex CLI

**Sources:** [config.md — github.com/openai/codex](https://github.com/openai/codex/blob/main/docs/config.md), [Configuration Reference](https://developers.openai.com/codex/config-reference) (redirects to `learn.chatgpt.com/docs/config-file/config-reference`, an OpenAI-controlled redirect target), [Hooks](https://developers.openai.com/codex/hooks) (redirects to `learn.chatgpt.com/docs/hooks`), [Changelog](https://developers.openai.com/codex/changelog) (redirects to `learn.chatgpt.com/docs/changelog`)

### 1. Config surface
User: `~/.codex/config.toml`. Project: `<repo>/.codex/config.toml`, loaded only for
trusted projects. TOML. Hooks specifically can also live in a sibling `hooks.json`
(user: `~/.codex/hooks.json`, project: `<repo>/.codex/hooks.json`) or an inline
`[hooks]` table in `config.toml`. Project-local config deliberately **ignores** a set
of sensitive keys with a startup warning (`openai_base_url`, `chatgpt_base_url`,
`model_provider`, `model_providers`, `notify`, `profile`, `profiles`, `otel`, etc.) —
hooks are not in that ignore-list, so a project-level hook write from `neuron init`
should take effect, but this is a documented, maintained boundary neuron would need to
respect for other keys. Instructions load from `AGENTS.md` by default;
`model_instructions_file` can replace it, `project_doc_fallback_filenames` adds
fallback names, and `project_doc_max_bytes` caps how many bytes are read from it.

### 2. Event/hook model
Session-level: `SessionStart`, `SessionEnd`, `SubagentStart`. During a turn:
`UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`,
`PostCompact`, `SubagentStop`, `Stop`. Source: `learn.chatgpt.com/docs/hooks`.

### 3. Injection capability — decisive
Per-event breakdown from the docs: **`SessionStart`, `UserPromptSubmit`,
`PreToolUse`, `PostToolUse`, and `SubagentStart`** all support `additionalContext` /
plain stdout being added as "extra developer context" the model sees. The docs state
for `UserPromptSubmit` specifically: *"That `additionalContext` text is added as extra
developer context,"* meaning it's shown alongside the user's submitted prompt — the
same shape as Claude Code's `UserPromptSubmit`. `PermissionRequest`, `PreCompact`, and
`PostCompact` explicitly ignore stdout (no injection); `SubagentStop`/`Stop` are
JSON-only decision events (`decision`/`reason`, comparable to Claude Code's blocking
`Stop`), not general context carriers; `SessionEnd` is advisory only and "won't steer
Codex." High confidence on the `SessionStart`/`UserPromptSubmit` finding since the docs
give it in direct-quote form.

### 4. Determinism
Per a changelog-aggregator characterization (not confirmed by directly reading
`openai/codex` release notes myself — **medium confidence on the exact version/date**),
hooks first shipped experimental and disabled-by-default in Codex CLI **v0.114 (~March
2026)**, not available on Windows, and reached **general availability around May 14,
2026** per the OpenAI-hosted changelog. Hooks can be toggled off entirely via
`[features] hooks = false` in `config.toml`. Separately, admins can set
`allow_managed_hooks_only = true` in `requirements.toml` to restrict execution to
managed hooks only, which cuts the other way — an org could suppress a
project-committed neuron hook. Once configured and enabled, a hook fires on its
lifecycle event regardless of what the LLM decides; the agent has no cooperation role.

### 5. Failure behaviour
Default timeout 600 seconds, except `SessionEnd` (1s default, 3s max). Non-zero exit
codes mark a hook as failed but **execution continues** — Codex is fail-open across the
board here, unlike Claude Code's blocking exit-2 convention. Multiple matching hooks
run concurrently; one failing doesn't block others from starting. This matters directly
for the ticket's "slow hook becomes a user-visible stall" concern: Codex's documented
posture is to not stall on a bad hook, at the cost of silently proceeding without the
injected content if the hook fails.

### 6. Payload limits
Roughly **2,500 tokens** of hook output reach the model by default
(`additionalContextLimit`, configurable); oversized content is spilled to disk with a
preview shown instead — the same "spill and preview" pattern as Claude Code, at a
token- rather than character-based limit.

### 7. Verifiability
No documented external verification mechanism found. Same inference as Claude Code:
config files (`hooks.json`/`config.toml`) are plain, parseable text, so neuron can
verify registration, not firing. Medium confidence, inferred.

---

## GitHub Copilot CLI

**Sources:** [About hooks for GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/hooks), [Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference), [Using hooks with Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks), [Copilot CLI configuration directory](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference), [Adding custom instructions for Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)

### 1. Config surface
`~/.copilot/` (or `$COPILOT_HOME`) holds `settings.json` (JSONC, the primary config,
hand-editable), `mcp-config.json`, `lsp-config.json`, and an `agents/` directory of
`.agent.md` files. Hooks specifically live in JSON files: `.github/hooks/*.json`
(repo-level, committable) and `~/.copilot/hooks/*.json` (personal, CLI-only). JSON with
a documented `"version": 1` + `hooks` object shape — reasonably safe for `neuron init`
to write into, though I found only two doc pages that describe the structure in detail,
versus the much more thoroughly specified schemas for Claude Code and Codex.

### 2. Event/hook model
`sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`,
`agentStop`, `subagentStart`, `subagentStop`, `errorOccurred`, and `notification`
(CLI-only). A coverage matrix in the hooks reference confirms `sessionStart`,
`userPromptSubmitted`, `preToolUse`, `postToolUse`, `sessionEnd`, `subagentStart`,
`subagentStop`, `agentStop`, and `errorOccurred` all apply to Copilot CLI (not just the
cloud coding agent); `notification` is CLI-only.

### 3. Injection capability — decisive, and this is where Copilot CLI diverges
`sessionStart` supports `additionalContext` **"injected into the session"** — confirmed
to apply to Copilot CLI specifically. `postToolUse` supports `additionalContext`
appended to the tool's result text the model sees, same-turn only. `notification`
(CLI-only) can inject `additionalContext` as a prepended user message. `subagentStart`
can prepend `additionalContext` to a subagent's prompt. **But `userPromptSubmitted` —
the per-turn, pre-prompt event — is documented as "no output processed, notification
only."** `preToolUse` is permission-decision only (`permissionDecision`: allow/deny/ask
+ `modifiedArgs`), not a context carrier. So Copilot CLI has a genuine, harness-executed
injection point, but it is **session-start-only**: there is no mechanism to refresh
injected context on every subsequent turn the way Claude Code's and Codex's
`UserPromptSubmit` do. For a recall feature meant to fire per-query, this is a real
functional gap, not just a documentation gap.

### 4. Determinism
Not explicitly addressed in any page reached. No global disable switch, no
admin/managed-policy override language (contrast with Claude Code's managed settings
and Codex's `requirements.toml` lock) was found for the CLI specifically. Flagged as an
open question rather than assumed either way — **low confidence, explicit gap.**

### 5. Failure behaviour
Default timeout 30 seconds, adjustable via `timeoutSec`; the troubleshooting docs
discuss raising the timeout when "hooks are timing out" but **do not state** whether a
timeout or non-zero exit blocks the session, warns, or silently continues, for any
event. **Explicit gap — not documented anywhere I could reach.**

### 6. Payload limits
**Not documented anywhere found.** Explicit gap.

### 7. Verifiability
**Not documented.** The docs recommend hook authors add their own logging inside the
hook script to debug it — that's a per-hook-author affordance, not a harness-level
mechanism neuron could rely on to confirm registration or firing externally. Explicit
gap.

**Net assessment:** ticket 10 predicted Copilot CLI's extensibility would be
"considerably thinner" than the others. That's borne out, but for a more specific
reason than "no mechanism": the mechanism is real (a documented `additionalContext`
injection path that the CLI itself executes, not the agent), but it only covers session
start, and four of the seven investigation questions above return "not documented" for
Copilot CLI specifically, versus zero or one such gaps for Claude Code and Codex. That
combination — partial coverage plus multiple undocumented reliability properties — is
why this lands at `best-effort` rather than `deterministic`.

---

## Google Antigravity CLI

**Sources:** [Antigravity Docs — CLI overview](https://antigravity.google/docs/cli/overview), [Antigravity Docs — Hooks](https://antigravity.google/docs/hooks), [Antigravity Docs — CLI Settings](https://antigravity.google/docs/cli/settings), [Antigravity Docs — CLI Features](https://antigravity.google/docs/cli/features), [google-antigravity/antigravity-cli](https://github.com/google-antigravity/antigravity-cli) (confirmed as the official repo — README links back to `antigravity.google/docs/cli/overview` and `antigravity.google/product/antigravity-cli`, and cites Google's own Terms of Service/Privacy Policy), [Transitioning Gemini CLI to Antigravity CLI — developers.googleblog.com](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)

This is the harness ticket 10 flagged as likely least-documented, and that held up:
confidence is genuinely lower here than for the other four, and several of the seven
points below are explicit gaps rather than confirmed facts.

### 1. Config surface
Per-user settings: `~/.gemini/antigravity-cli/settings.json`, plain JSON, described as
using "sparse persistence" (only values that differ from defaults are written to disk).
No per-project config path was found in any page reached. **Note the path is under
`~/.gemini/`, not `~/.antigravity/`** — Google's own developer blog confirms Antigravity
CLI is a transition/evolution of Gemini CLI, which explains the legacy branding in the
path but is worth flagging since it means the two products may share more
infrastructure (and config precedence surprises) than the "Antigravity" name implies.
Hooks are configured separately, per `antigravity.google/docs/hooks`, in a `hooks.json`
file located in "your customization directory (e.g., `.agents/` in your workspace or
`~/.gemini/config/`)" — **this is a third, inconsistent path fragment relative to the
settings.json location above**, and it showed up consistently across separate fetches
of separate official pages, so this reads as a real inconsistency in Google's own docs
at this point in the product's life, not a fetch artifact. Given that, I would not
currently call this a stable, safe target for `neuron init` to write into without a
human confirming the actual path on a live install first. Low-to-medium confidence.

### 2. Event/hook model
Five events: `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop`. No
documented `SessionStart`/`SessionEnd` hook was found — session-scoped standing context
is instead handled by the static `AGENTS.md` instruction file (project root, plus a
global `~/.gemini/AGENTS.md`; the exact global path is corroborated only via a search
snippet, not a direct fetch — flag lower confidence on that specific path), not a hook.

### 3. Injection capability — decisive
`PreInvocation` and `PostInvocation` support an `injectSteps` array that can add tool
calls, user messages, or ephemeral system messages to the trajectory **before or after
every model call** — `PreInvocation` firing before every model invocation is
functionally Antigravity's equivalent of "pre-prompt," and on paper this is the most
general per-turn injection mechanism of all five harnesses (full trajectory
manipulation, not a single text field). `PreToolUse`/`PostToolUse` are gating/side-effect
only — `PreToolUse` returns a `decision` (`allow`/`deny`/`ask`/`force_ask`), and
`PostToolUse` "always returns empty JSON" per the docs, i.e. no injection there. Medium
confidence — this is a real, named capability in the official docs, but I could not
find a worked example (the way Claude Code and Codex both provide) to confirm the exact
shape/behavior of `injectSteps` in practice.

### 4. Determinism
Individual hooks can be disabled via an `"enabled": false` field. No "guaranteed to
fire" language, and no admin/managed-policy lock mechanism (unlike Claude Code and
Codex) was found anywhere reachable. **Explicit gap.**

### 5. Failure behaviour
Handlers support an optional `timeout` field, default 30 seconds. No documented
block/warn/continue behavior on error or timeout was found anywhere reachable.
**Explicit gap.**

### 6. Payload limits
**Not documented anywhere found.** Explicit gap.

### 7. Verifiability
**Not documented.** Explicit gap.

**Net assessment:** the mechanism described (`PreInvocation`/`PostInvocation`
`injectSteps`) is, if it works as named, the strongest per-turn injection point of the
five on paper. But the config-path inconsistency across official docs, and the absence
of any documented reliability guarantee for five of the seven investigation points,
means this can't honestly be called `deterministic` today — it's `best-effort` with
several sub-points genuinely unknown rather than merely unconfirmed-but-implied.

---

## OpenCode

**Sources:** [Plugins — opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/), [Rules — opencode.ai/docs/rules](https://opencode.ai/docs/rules/), [anomalyco/opencode](https://github.com/anomalyco/opencode) (the repository formerly at `sst/opencode`; renamed/moved — both names may appear in third-party material)

### 1. Config surface
`opencode.json`/`opencode.jsonc` at the project root; `~/.config/opencode/opencode.json`
globally. JSON/JSONC, with a documented multi-layer merge order (remote →
global → env-var custom config → project → `.opencode/` directories → env-var inline
config → managed config → macOS managed preferences) — this is a well-specified,
mergeable format, safe for `neuron init` to add a top-level entry to.

**However, the hook mechanism itself is not declarative config.** A plugin is an
async JavaScript/TypeScript module (placed in `.opencode/plugins/` or
`~/.config/opencode/plugins/`, or published as an npm package and listed in the
`plugin` array) that receives context and returns an object of event handlers. There is
no first-party equivalent of "put a shell command string in a JSON file" — that
exists only as third-party community wrapper plugins (e.g. `opencode-command-hooks`,
`opencode-yaml-hooks`) that themselves have to be installed as plugins to provide a
declarative layer on top. This makes `neuron init`'s job materially different and
higher-risk for OpenCode than for the other four: it would need to generate and ship a
working JS/TS module (code generation), not just merge a JSON block. Noting the
community packages exists to explain the ecosystem shape; they were not read as
citations for OpenCode's own guarantees, since they're unofficial.

### 2. Event/hook model
30+ named events. Relevant subset: `session.created`, `session.compacted`,
`session.deleted`, `session.idle`, `session.updated`, `session.error`,
`message.part.updated`/`removed`, `message.updated`/`removed`, `tool.execute.before`,
`tool.execute.after`, `command.executed`, `file.edited`, `permission.asked`/`replied`,
and — most relevant to pre-prompt injection — `chat.message`, `chat.params`,
`chat.headers`, `experimental.chat.system.transform`,
`experimental.chat.messages.transform`, `experimental.session.compacting`,
`experimental.compaction.autocontinue`. No dedicated `SessionStart`/`SessionEnd` event
name was found in the fetched docs; `session.created`/`session.idle` appear to be the
nearest equivalents.

### 3. Injection capability — decisive
`chat.message` and `chat.params` fire before each message is sent to the model and can
mutate the outgoing payload; `chat.message` fires **after** the system prompt is built,
while `experimental.chat.system.transform` fires **during** system-prompt construction
— giving a plugin two different points to inject text into every single turn, which is
a genuine, general pre-prompt mechanism, and arguably the most flexible of the five
since it's arbitrary code operating on the full request rather than a single
`additionalContext` string field. `tool.execute.before`/`after` cover the tool-loop
equivalent of `PreToolUse`/`PostToolUse`. `experimental.session.compacting`'s
`output.context`/`output.prompt` lets a plugin inject or fully replace context
specifically during summarization.

### 4. Determinism
Plugins are auto-discovered and loaded from the documented plugin directories at
startup (npm-published plugins installed automatically via Bun). No stated guarantee
language comparable to Claude Code's or Codex's exit-code/timeout tables was found, and
no admin/managed-policy lock exists. Because the mechanism is arbitrary code rather than
a fixed hook contract, whether a given plugin's handler is reliably invoked on every
matching event is a property of the plugin author's code as much as the harness — the
harness's own guarantee (if any) wasn't found documented. **Explicit gap.**

### 5. Failure behaviour
**Not documented anywhere reached** — no stated behavior for a throwing or hanging
plugin hook (block, warn, or continue). This is the one thing every other harness at
least partially addresses. Two open GitHub issues on `anomalyco/opencode`
(`#21240`, requesting a pre-inference hook; `#14863`, requesting "native hooks support
for session lifecycle events") suggest the hook surface is still actively evolving —
noted as an impression from issue *titles*, not resolved documentation, so this is
low-confidence color, not a citation for current behavior.

### 6. Payload limits
**Not documented anywhere found.** Explicit gap.

### 7. Verifiability
**Not documented.** Explicit gap.

**Net assessment:** OpenCode's `chat.message`/`chat.params` pairing gives it, on paper,
the richest and most general per-turn injection surface of the five — full code control
over the outgoing prompt, not a single text field, firing on every turn. But nothing
about failure handling, payload limits, or execution guarantees is documented, and the
mechanism requires shipping working plugin code rather than a declarative config
block — a materially higher engineering and reliability bar for `neuron init` to clear
than Claude Code's or Codex's JSON/TOML hook entries. Given ticket 10's framing that a
mechanism existing isn't sufficient by itself without guarantees, `best-effort` is the
honest verdict here, on the same basis as Copilot CLI and Antigravity but for the
opposite reason: those two have documented determinism gaps *and* narrower injection
coverage; OpenCode has the widest coverage but the least documented reliability of any
of the five.

---

## Cursor

**Sources:** [Hooks — cursor.com/docs/hooks](https://cursor.com/docs/hooks), [Rules — cursor.com/docs/context/rules](https://cursor.com/docs/context/rules), [CLI Configuration — cursor.com/docs/cli/reference/configuration](https://cursor.com/docs/cli/reference/configuration), [Cursor CLI overview](https://cursor.com/docs/cli/overview)

Cursor is primarily a VS Code-fork IDE, with a separate `cursor-agent` CLI product
built on the same agent core. The hooks system below is documented under the general
Cursor docs and explicitly covers IDE agent chat and cloud/background agents; I could
**not** find explicit confirmation that `.cursor/hooks.json` is read by the standalone
CLI (`cursor-agent`) product specifically — flagged as a gap below, not assumed either
way.

### 1. Config surface
Hooks: `.cursor/hooks.json` at project root, `~/.cursor/hooks.json` at user level, plus
enterprise-managed paths (macOS `/Library/Application Support/Cursor/hooks.json`,
Linux/WSL `/etc/cursor/hooks.json`, Windows `C:\ProgramData\Cursor\hooks.json`), with a
documented precedence order Enterprise → Team → Project → User. JSON with a `version`
field and a `hooks` object — well-specified and safe for `neuron init` to write into,
matching Claude Code's and Codex's level of documentation. Rules (the instruction-file
surface): project rules live as `.mdc` files in `.cursor/rules/`, with `description`,
`globs`, and `alwaysApply` frontmatter; the legacy single `.cursorrules` file is still
read but deprecated; a lightweight `AGENTS.md` is also supported as an alternative;
global/user rules are **not file-based** — they live only in Cursor's in-app settings
UI (Customize → Rules), which is a meaningfully different, non-scriptable surface
compared to every other harness's user-level instruction file. The separate
`cursor-agent` CLI has its own config: `~/.cursor/cli-config.json` (global) and
`<project>/.cursor/cli.json` (project, permissions-only), pure JSON, no comments.

### 2. Event/hook model
Documented events: `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`,
`postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`,
`afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`,
`afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`,
`afterAgentThought`, plus Tab-specific (`beforeTabFileRead`, `afterTabFileEdit`) and
IDE-lifecycle (`workspaceOpen`) events that don't apply to agent/CLI use. This is the
same naming convention family as Claude Code's (PascalCase-ish event names, matcher +
command handlers), which is unsurprising given how much of this ecosystem has
converged on a shared shape.

### 3. Injection capability — decisive, and the same shape as Copilot CLI
`sessionStart` outputs an `additional_context` field added to system context.
`postToolUse` provides `additional_context` inserted after tool results, same-turn.
`stop` supports a `followup_message` that gets resubmitted as a new user message —
a real but indirect injection path (it creates another turn rather than augmenting the
current one). **`beforeSubmitPrompt` — the hook that fires on every single turn before
the prompt reaches the model, i.e. the literal "pre-prompt" point ticket 10 asks
about — is documented as permission-only: it can allow or block the prompt, but does
not carry a context-injection field.** `afterFileEdit` and `beforeShellExecution` are
likewise observation/permission-only. So, like Copilot CLI, Cursor has a genuine
harness-executed injection mechanism, but it is anchored at session start (and
opportunistically after tool use), not refreshed on every user turn.

### 4. Determinism
No documented global disable switch was found; the docs describe hooks as
auto-reloaded on file changes and executed "when conditions match," which reads as a
determinism claim but isn't phrased as an explicit guarantee the way Claude Code's or
Codex's exit-code tables are. Enterprise-tier hook files exist and sit above
project/user hooks in precedence, which — as with Claude Code's managed settings and
Codex's `requirements.toml` lock — means an org can enforce or override hooks a user
sets, cutting toward more determinism, not less, at the org level. Project-level hooks
are confirmed to run in **cloud/background agents** too, with an explicit carve-out:
`sessionStart`/`sessionEnd`, `beforeMCPExecution`/`afterMCPExecution`,
`beforeTabFileRead`/`afterTabFileEdit`, and `workspaceOpen` do **not** run in cloud
agents (environment/timing constraints), and user-level hooks never run in cloud agents
at all (no home directory). This is a real, documented determinism *caveat* specific to
Cursor's split between local-IDE and cloud-agent execution — worth carrying into ticket
`11` if cloud/background Cursor agents are ever a target, since `sessionStart` (the main
injection point) is exactly one of the events that's cut.

### 5. Failure behaviour
This is the best-documented failure model of the six on the "what happens if a hook
errors" axis: **default is fail-open** — a hook crash, timeout, or invalid JSON output
results in the action proceeding normally, with a log entry. A per-hook
`"failClosed": true` flag is available and is explicitly recommended for
security-sensitive hooks like `beforeMCPExecution`/`beforeReadFile`. Exit code 0 =
success, JSON parsed; exit code 2 = block (permission deny); other non-zero = failure,
action proceeds (fail-open default). Timeout is configurable per hook via a `timeout`
field; no documented default value was found (flagged — the docs describe it as
"platform-specific" without stating a number).

### 6. Payload limits
**Not documented anywhere found.** The `stop`/`subagentStop` hooks have a
`loop_limit` (default 5, `null` for unlimited), but that bounds iteration count, not
context/payload size. Explicit gap, same as four of the other five harnesses.

### 7. Verifiability
Not documented as an external API. The failure-behavior text mentions failed hooks are
"logged," which hints at a log file neuron could in principle read, but no stable,
documented log location or format was found — same inference-only status as every
other harness in this report. Explicit gap.

**Net assessment:** Cursor lands in the same functional position as GitHub Copilot
CLI — a real, harness-executed, documented context-injection field exists
(`additional_context` on `sessionStart`/`postToolUse`), but the one hook that fires on
every turn before the model sees the prompt is permission-only, not a context carrier.
Cursor's failure-handling story is better documented than Copilot CLI's (explicit
fail-open default, an opt-in `failClosed` mode, and clear exit-code semantics), and its
hook config format is more thoroughly specified — but the core coverage gap is the
same, so it gets the same `best-effort` verdict for the same structural reason: session-
start injection only, no per-turn refresh.

---

## Harnesses that fall back to AGENTS.md-style instruction-only recall

**None, based on what could be verified.** All six harnesses expose at least one
harness-executed hook whose documented output is capable of landing in the model's
context (as opposed to only performing side effects like blocking a tool call or
logging), separate from and in addition to their respective standing-instructions file
(`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex CLI and Antigravity CLI,
`.github/copilot-instructions.md`/`AGENTS.md`/`CLAUDE.md` for Copilot CLI, `AGENTS.md`
for OpenCode, and `.cursor/rules/*.mdc`/legacy `.cursorrules`/`AGENTS.md` for Cursor).

This is a materially different result than the ticket's premise anticipated for at
least Copilot CLI ("considerably thinner" was expected to possibly mean "no
mechanism"). What the research actually found is that Copilot CLI, Antigravity CLI,
OpenCode, and Cursor all have *real* mechanisms, but each has a **different specific
reason** it falls short of `deterministic`:

- **Copilot CLI** — mechanism is real but narrow: injection is confirmed only at
  session start, with no per-turn (pre-prompt) equivalent, and half the reliability
  questions (disable switch, failure/timeout blocking, payload limits, verifiability)
  are undocumented.
- **Cursor** — same narrow shape as Copilot CLI (session-start/post-tool-use injection
  only; the per-turn `beforeSubmitPrompt` hook is permission-only, not a context
  carrier), but with a materially better-documented failure model (explicit fail-open
  default, opt-in `failClosed`, clear exit codes) and a real, separately-documented
  determinism caveat: several of its hooks — including `sessionStart`, the main
  injection point — don't run at all in cloud/background agent execution.
- **Antigravity CLI** — mechanism is the most general on paper (`injectSteps` on every
  model call) but the product's own docs are internally inconsistent on config paths,
  and nearly every reliability property is undocumented.
- **OpenCode** — mechanism is the most flexible (arbitrary code touching every outgoing
  prompt) but requires shipping working plugin code rather than config, and no
  reliability property (failure, timeout, payload limit, verification) is documented
  anywhere reached.

Only **Claude Code** and **Codex CLI** cleared the full bar: a documented per-turn
injection point, documented failure/timeout semantics that don't silently hang the
session, a documented payload cap with defined overflow behavior, and no undocumented
gaps among the seven investigation points. That two of six clear it cleanly is,
per the ticket's own framing, the useful result — it's what should drive ticket `11`'s
adapter architecture (build the deterministic path properly for these two, and design
the `best-effort` path for the other four as an honestly-labeled degraded mode rather
than pretending it's equivalent).
