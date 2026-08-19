---
title: "Quickstart: Initialize a Project and Record Your First Memory"
description: "neuron init, your first memory add, and your first query — what each command does and what just happened."
---

## Initialize your project

Run this from your project's root directory:

```bash
neuron init
```

`neuron init` detects every coding-agent harness present (`.claude/`,
`.codex/`, `.github/`, `.cursor/`, or a bare `AGENTS.md`, defaulting to
creating `AGENTS.md` if none is found), pre-downloads the local ONNX models
neuron runs offline, and wires a recall hook into every detected harness
that supports one. It also writes a starter `neuron.yaml` and appends a
`## Memory Store Protocol` block to each harness's instructions file.

You can also just tell your coding agent "Set up neuron memory for this
project" — it runs the same interview and configures the project for you.

## Record a memory

```bash
neuron memory add --category learning "Always use the Repository Pattern for database access in src/services"
```

This writes one entry to `.neuron/learning.md`, plain markdown with a small
YAML frontmatter block (`id`, `createdAt`, `importance`, `tags`). Nothing
here is a database row you'd need a viewer to inspect — open the file in
any editor.

## Query it back

```bash
neuron memory query "How do we handle database access?"
```

This runs [hybrid search](/docs/hybrid-search/) — semantic and keyword
matching combined — over every category configured for query, and returns
the entry you just wrote even though the query text shares no exact phrase
with it.

## Limitations

Recall — neuron surfacing a relevant memory back to your agent — is solved
by the hook `neuron init` just wired. It does not solve the other half:
getting your agent to *write* to the store in the first place. An A/B test
measured that gap directly — under realistic multi-step conditions, an
agent with no nudge recorded a fix only 20% of the time it should have. To
close it, `neuron init` also wires a `pre-stop` hook that, once per
session, forces one more turn with a reminder if nothing has been recorded
yet. See the [harness adapter pages](/docs/harness-adapters/) for which
harnesses support this mechanism and how.

Source: [`README.md` "Write-side compliance gets a nudge, not just a reminder"](https://github.com/kovartravis/neuron/blob/main/README.md#write-side-compliance-gets-a-nudge-not-just-a-reminder).
