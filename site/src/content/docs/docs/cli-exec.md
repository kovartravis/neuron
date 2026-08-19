---
title: "neuron exec — Pre-Execution Memory Lookup"
description: "Runs a command with a relevance-gated memory lookup first, then passes the exit code through unchanged."
---

`neuron exec -- <command>` runs a command with a pre-execution memory
lookup. Matches print to `stderr`, filtered through the
[relevance gate](/docs/hybrid-search/#a-second-gate-before-anything-is-injected): a result whose
top hit has no keyword match at all is rejected, regardless of semantic
similarity. If the gate rejects every candidate, `neuron exec` still prints
a line naming the command and how many candidates it rejected, so an empty
result is distinguishable from an empty store. The command itself runs with
inherited `stdio`, and its exit code passes straight through.

## Usage

```bash
neuron exec -- npm test
neuron exec -- git commit -m "message with spaces"
```

Arguments are spawned as an argv array, so quoting is preserved — a
multi-word `-m` value reaches the underlying command intact. To use shell
operators (`&&`, pipes), pass the whole thing as one quoted string instead:

```bash
neuron exec -- "npm run build && npm test"
```

## Which categories get searched

Which categories `exec` searches, and how many results it returns, comes
from `pullRules.onExec` in `neuron.yaml` — matched against the command text
by regex. See the [config reference](/docs/config-reference/#pullrulesonexec)
for the exact field shape.

## Limitations

`neuron exec` is purely informational — it never blocks the command it
wraps, even when it finds a highly relevant match. On Claude Code and Codex
CLI, `neuron init` wires a `pre-command` hook that runs this same lookup
automatically on every shell tool call, surfacing a hit as context instead
of requiring the agent to remember to type `neuron exec` itself — see the
[harness adapter pages](/docs/harness-adapters/) for which harnesses get
that hook.

Source: [`README.md` "Command execution gets the same treatment"](https://github.com/kovartravis/neuron/blob/main/README.md#command-execution-gets-the-same-treatment).
