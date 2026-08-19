---
title: "Install Neuron via npm or a Standalone Binary"
description: "Two fully-supported install paths for neuron — npm, or a curl/PowerShell-installed binary with no Node.js dependency."
---

## Two install paths, neither more official than the other

Neuron ships two fully-supported ways to install it — pick whichever fits
your workflow.

```bash
# npm (requires Node.js)
npm install -g @kovartravis/neuron
```

```bash
# curl (macOS/Linux) — standalone binary, no Node.js required
curl -fsSL https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh
```

```powershell
# PowerShell (Windows) — standalone binary, no Node.js required
powershell -c "irm https://raw.githubusercontent.com/kovartravis/neuron/main/install.ps1 | iex"
```

Neuron supports macOS, Linux, and Windows.

## Keeping it up to date

The upgrade command depends on which path you installed through:

- Installed via curl or PowerShell: run `neuron upgrade` to self-update the
  binary in place.
- Installed via npm: run `npm update -g @kovartravis/neuron`.

## What happens next

Installation only places the `neuron` binary — it doesn't touch your
project. The [quickstart](/docs/quickstart/) covers `neuron init`, the
command that bootstraps a project to use it.

Source: [`README.md` "Quick start"](https://github.com/kovartravis/neuron/blob/main/README.md#-quick-start).
