---
title: "neuron ui — Local Dashboard"
description: "Launches the local web dashboard for browsing the memory store, with --port and --no-open."
---

`neuron ui` launches a local web dashboard for browsing the memory store.
It binds to the requested port if free, or the next free port above it, and
opens your default browser automatically unless told not to.

## Flags

| Flag | Effect |
|---|---|
| `--port <n>` | Preferred port (default: `3333`). If already in use, the server binds the next free port above it instead of failing |
| `--no-open` | Don't launch a browser automatically |

## Examples

```bash
neuron ui                    # opens a browser at the first free port from 3333
neuron ui --port 4000        # prefer 4000
neuron ui --no-open          # print the URL, don't launch a browser
```

Stop the server with `Ctrl-C` — `neuron ui` runs in the foreground until
interrupted.
