---
title: "neuron feedback — Pre-Filled GitHub Issue Links"
description: "Generates a pre-filled GitHub issue link from the command line, with an optional message, type, and title."
---

`neuron feedback [message]` generates a pre-filled GitHub issue link,
printed to `stderr` as a clickable URL and to `stdout` as JSON.

## Flags

| Flag | Effect |
|---|---|
| `--type <bug\|feature\|general>` | Issue template / label to pre-select |
| `--title <text>` | Issue title. Defaults to the first 60 characters of `message` if omitted, or `"User Feedback"` if no message was given either |

## Examples

```bash
neuron feedback "the prune ceiling caught me off guard" --type bug
neuron feedback --type feature --title "Support YAML anchors in categories"
```
