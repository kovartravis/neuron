# Windows install path: what shipped, and what's deferred

**Date:** 2026-08-17
**Resolves:** Ticket 7 (Ship the Windows Install Path) of the
"Curl-Installable Standalone Binary" map.
**Builds on:** `windows-install-convention-research.md` (Ticket 2's
research), `ci-build-matrix.md` (Ticket 5 — real asset names and
`SHA256SUMS` format this ticket verifies against).

## What shipped

**`install.ps1`** at the repo root — the primary channel Ticket 2's
research recommended, mirroring Deno's and Bun's own `irm <url> | iex`
mechanics:

```powershell
powershell -c "irm https://raw.githubusercontent.com/kovartravis/neuron/main/install.ps1 | iex"
```

- Detects architecture via
  `[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture`
  (reads the real OS architecture, correct even under x64-on-ARM64
  emulation — the same concern Bun's script handles by reading the
  registry directly; .NET exposes it without needing that).
- Downloads `neuron-windows-x64.exe` or `neuron-windows-arm64.exe` — the
  **raw executable Ticket 5's CI matrix actually produces and uploads**,
  not a zip. The research doc's own recommendation assumed a zip by
  analogy with Deno/Bun before a real build existed to check; Ticket 5
  settled that neuron's release assets are unzipped `.exe` files (same
  shape as the macOS/Linux assets `install.sh` downloads), so this script
  downloads and installs that file directly, no extraction step.
- Downloads `SHA256SUMS` from the same release and verifies the matching
  entry before installing anything — same checksum-or-refuse discipline
  as `install.sh` (Ticket 6), reusing the identical `SHA256SUMS` file
  Ticket 5's `release-assets` job generates (one file, all 6 targets).
- Installs to `$env:NEURON_INSTALL` or `%USERPROFILE%\.neuron\bin` by
  default (mirrors `install.sh`'s `NEURON_INSTALL`/`$HOME/.neuron/bin`,
  which itself mirrors Deno's `DENO_INSTALL` convention per Ticket 2's
  research), and adds that directory to the user-scope PATH via
  `[System.Environment]::SetEnvironmentVariable(..., 'User')` — Deno's
  mechanism, chosen over Bun's raw-registry-key + `WM_SETTINGCHANGE`
  approach as the simpler of the two verified options, per the research
  doc's own recommendation. No admin elevation required.

**Not verified against a real release**, for the same reason `install.sh`
wasn't (Ticket 6): no GitHub Release with Ticket 5's asset names has been
cut yet (`gh release list` on this repo returns none as of this writing).
Also not executable in this dev environment — no `pwsh`/PowerShell
available to run it locally. Reviewed by hand for correctness against the
real `SHA256SUMS` line format (`sha256sum`'s two-space text-mode output)
and against Deno's and Bun's own verified script mechanics from Ticket 2's
research. Real end-to-end verification is follow-up once the first real
release with binary assets ships — same gap `install.sh` already carries.

## What's deferred, and why

Ticket 2's research recommended winget as a **secondary** channel and a
Scoop bucket entry as **tertiary** — both real, both declined as this
ticket's headline deliverable for a concrete reason neither research nor
grilling could resolve in advance: **both require a real, already-cut
release to point at.** A winget manifest's installer YAML pins an exact
version, download URL, and SHA256; Scoop's manifest does the same. Neither
can be authored for real against a release that doesn't exist, and winget
specifically requires submitting a PR against the external
`microsoft/winget-pkgs` repository — not something to fabricate against
placeholder data, and not an action to take unreviewed even once a real
release exists (it's a submission to a repo this project doesn't own).

This is the same shape of gap the map already accepted twice: Ticket 4
shipped unsigned binaries rather than blocking on a code-signing cert that
didn't exist yet, and Ticket 5 shipped a WASM-only ONNX path rather than
blocking on a fix to a pkg limitation. Consistent with that posture, the
Destination this map is finding its way to — "the curl command works
end-to-end on every target platform" — is satisfied by `install.ps1` for
Windows the same way `install.sh` satisfies it for macOS/Linux; winget and
Scoop are real value-adds on top, not required to reach it.

**Drafted, not filed**, ready to fill in once a real release exists:

`packaging/winget/kovartravis.neuron.yaml` (version manifest),
`packaging/winget/kovartravis.neuron.installer.yaml` (installer manifest —
`PortableCommandAlias: neuron`, x64 + arm64 entries pointing at the two
Windows release assets), `packaging/winget/kovartravis.neuron.locale.en-US.yaml`
(locale manifest), and `packaging/scoop/neuron.json` (Scoop manifest with
`checkver`/`autoupdate` wired to GitHub Releases). Each has a `<VERSION>`
/ `<SHA256_X64>` / `<SHA256_ARM64>` placeholder where real values go. None
of the four has been validated against its schema or submitted anywhere —
that's real follow-up work for whoever cuts the first release with binary
assets, tracked here rather than silently forgotten.

**Chocolatey**: not drafted at all, per the research doc's explicit
recommendation against it (lowest signal-to-effort ratio of the channels
surveyed, never a tool's own first-party-documented primary or clear
secondary method in anything the research fetched directly).
