# OpenCode Harness Support — Follow-Up Research (neuron-2.4.3, Ticket 10)

Re-verifies `harness-compatibility.md`'s OpenCode section (originally researched
under neuron-2.2.0's ticket 10, ruled out of scope 2026-08-03 by ticket 11's
grilling) against OpenCode's *current* documentation and community-reported
behavior, per this ticket's question: has anything settled since the original
verdict?

## Method and sourcing

Live fetches against `opencode.ai/docs/plugins/` and `opencode.ai/docs/`
(2026-08-16), the `@opencode-ai/plugin` npm package (current version 1.18.15),
and GitHub issue search against `anomalyco/opencode` (the renamed/moved
`sst/opencode`) and third-party plugins that consume its hook API. Community
guides (gists, dev.to, plugin-marketplace listings) were used only to
corroborate hook signatures already visible in official docs/package
metadata, never as a standalone citation for a reliability guarantee.

## What's unchanged from the original verdict

Every gap the original research flagged is still a gap today:

- **Failure behaviour** (throw/hang/timeout → block, warn, or continue):
  not documented anywhere reached, official or unofficial.
- **Payload/size limits** on what a hook can inject: not documented anywhere
  found.
- **Timeout value**: not documented anywhere found.
- **External verifiability** (can neuron confirm from outside that its hook
  is registered and firing): not documented as a stable API. A `--print-logs
  --log-level DEBUG` flag surfaces plugin load activity in log output, but
  that's a debug flag, not a documented contract — same status as every other
  harness neuron ships (`VerifyPointStatus` in `src/harnesses/types.ts`
  already assumes no harness documents this, and instead has neuron's own
  hook write its own firing timestamp; this isn't a special OpenCode
  blocker).
- **Installation shape**: still arbitrary plugin code (`.opencode/plugins/`,
  `~/.config/opencode/plugins/`, or an npm package), not declarative config.
  `neuron init` would still need to generate and ship a working JS/TS module,
  not merge a JSON block — the same materially-higher engineering/reliability
  bar the original research named.
- **The injection mechanism itself is still, if anything, the richest of any
  harness researched**: `chat.message` (fires after the system prompt is
  built, can intercept/modify the outgoing message and its parts) and
  `chat.params` (can modify model/temperature/options) are both live in the
  current `@opencode-ai/plugin` Hooks type (`tool, auth, event, config,
  chat.message, chat.params, permission.ask, tool.execute.before,
  tool.execute.after`). `experimental.session.compacting` still documents
  `output.context.push()`/`output.prompt` for compaction-time injection —
  confirmed directly from the current official plugins page.

## What's new since the original verdict

Two live GitHub issues on `anomalyco/opencode` and a real third-party plugin
give the abstract "undocumented failure behaviour" gap a concrete, current
shape:

1. **Unknown hook keys are silently discarded — no error, no warning.**
   [`vectorize-io/hindsight#2656`](https://github.com/vectorize-io/hindsight/issues/2656):
   a real memory/recall plugin (`@vectorize-io/opencode-hindsight`) registered
   `experimental.chat.system.transform` and `experimental.session.compacting`
   under a locally-defined hook-name interface rather than importing the
   names from the SDK; OpenCode loads the plugin without error and simply
   never invokes those hooks. The plugin's own auto-recall feature — the
   *same shape of feature this ticket is evaluating an adapter for* — has
   been silently broken in production with no signal to the user. This is a
   direct, current, empirical demonstration of exactly the risk ADR 0014's
   capability-record bar exists to prevent: shipping a capability record
   neuron has no source for.
2. **A documented-sounding hook that's defined but never triggered.**
   [`anomalyco/opencode#7006`](https://github.com/anomalyco/opencode/issues/7006):
   `permission.ask` is a real member of the `Hooks` type, but
   `PermissionNext.ask()` never calls `Plugin.trigger("permission.ask", ...)`
   — it publishes straight to the UI event bus instead. A hook can be present
   in the type signature and still not fire. No maintainer response confirms
   a timeline for a fix.

Neither issue is about `chat.message`/`chat.params` specifically — no report
of *those* two hooks silently failing to fire was found — but both confirm
the pattern the original research could only infer from absence of
documentation: OpenCode's plugin dispatch has real, current gaps between
"defined in the type" and "actually invoked," with no error surfaced when it
happens. That raises the cost of *not* having a documented failure/timeout
contract from theoretical to demonstrated.

## Verdict

**No-go, unchanged.** The docs have not settled — every property the
capability-record bar requires (`failurePosture`, `timeoutMs`,
`payloadCapChars`, per `src/harnesses/types.ts`'s `SupportRecord`) is still
undocumented for `chat.message`/`chat.params`, exactly as of the original
2026-08-03 ruling. If anything, this pass strengthens rather than weakens
that ruling: it replaces "no evidence either way" with two concrete, current
bug reports showing the plugin dispatch layer has real silent-failure modes,
one of them in a plugin attempting the exact feature (write-side/read-side
recall injection) neuron would be shipping. Building an adapter today would
mean publishing a `best-effort` capability record on a mechanism with active,
unacknowledged reliability gaps — the harness-lying risk ADR 0014 exists to
prevent, now with a live case study rather than a hypothetical one.

Returns, per the original ticket's own exit condition, only behind a
follow-up **research ticket that measures the behaviour empirically**
(a throwing/hanging `chat.message` handler run against a real OpenCode
install) — reading docs a third time without running code against a real
install will keep landing on the same "not documented" answer.

## This ticket's own scope-fit question

This map's destination is write-compliance and store-cleanup, not harness
breadth (neuron-2.3.0/2.4.0 covered prior harness-expansion work). Since the
verdict is no-go, there's no adapter-build ticket to home anywhere — nothing
to route to a different map. If a future empirical-measurement ticket
reverses this verdict, *that* ticket's build-out belongs with the other
harness-adapter tickets, not this map.
