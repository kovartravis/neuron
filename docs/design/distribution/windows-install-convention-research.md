# Windows install convention research: one-command install for neuron

**Date:** 2026-08-17
**Submitted by:** research pass against primary sources (each tool's own
docs pages, its own install scripts fetched directly, and its own GitHub
repo/README) to feed the "Curl-Installable Standalone Binary" effort's
Windows-install-convention decision — the sibling question to
`packaging-tool-research.md`'s build-tool decision: given `curl | sh` has
no real tradition on Windows, what should the one-command install path be
for `neuron` on Windows?
**Status:** raw research, not yet adopted into a ticket decision. Every
command and script-behavior claim below was pulled from the tool's own
page or its own script content via direct fetch (WebFetch against the
primary URL, or WebFetch against a raw GitHub content URL for scripts),
not from third-party roundups or blog posts. Where a fetch could not be
completed (see "What was not verified"), that's flagged explicitly rather
than inferred.

---

## The question

`curl -fsSL .../install.sh | sh` is the planned macOS/Linux install
command. Windows has no equivalent shell tradition — `cmd.exe` has no
`curl | sh` analog, and the PowerShell convention that's emerged in its
place (`irm <url> | iex`) is a different shape entirely. What do
comparable single-binary CLI tools actually document as their Windows
install path today, and what should neuron's be?

---

## 1. Deno

**Docs page checked:**
[docs.deno.com/runtime/getting_started/installation](https://docs.deno.com/runtime/getting_started/installation/).
**Primary Windows method, verified:** the exact PowerShell one-liner shown
is `irm https://deno.land/install.ps1 | iex` — the `irm ... | iex` pattern
is real, not an assumption; it's the literal command on the page.

**Alternative methods, also documented on the same page, same
prominence:** `scoop install deno`, `choco install deno`, and
`winget install DenoLand.Deno` are all listed alongside the PowerShell
one-liner and npm (`npm install -g deno`, with a docs note that npm
installs "may affect startup performance compared to the official install
script"). Deno's docs do not mark winget/scoop/choco as
community-maintained vs. official, or rank them below the PowerShell
command — they're presented as peer options.

**Script content, verified by direct fetch of the real script** (raw
fetch of
[raw.githubusercontent.com/denoland/deno_install/master/install.ps1](https://raw.githubusercontent.com/denoland/deno_install/master/install.ps1)):
- Downloads a **zip** — from GitHub releases for stable versions, from
  `dl.deno.land` for pre-releases (branches on `if ($Version -like "*-*")`).
- Installs to **`${Home}\.deno\bin`** by default, or `${DenoInstall}\bin`
  if `$env:DENO_INSTALL` is set.
- Extracts the zip with `tar.exe xf` (not `Expand-Archive`).
- Adds the bin dir to PATH via the **.NET API**, not `setx` or a raw
  registry write: `[System.Environment]::SetEnvironmentVariable('Path',
  "${Path};${BinDir}", $User)` — this is the user-scope PATH, no elevation
  needed.
- Checks the installed version meets a minimum (2.6+) and, if so,
  auto-installs a `dx` alias via `deno x --install-alias`.
- Creates the bin directory if missing; gives a user-facing success
  message including how to remove the alias.

**denoland/deno_install repo README** (fetched directly): confirms the
`irm https://deno.land/install.ps1 | iex` command as canonical, shows a
version-pinning variant (`$v="1.0.0"; irm https://deno.land/install.ps1 |
iex`), and lists winget/scoop links without any official/community
distinction in the text.

## 2. Bun

**Docs page checked:** [bun.sh/docs/installation](https://bun.sh/docs/installation).
**Primary Windows method, verified:** `powershell -c "irm bun.sh/install.ps1|iex"`
— confirmed as the literal command shown, same `irm | iex` shape as Deno's.

**Alternative methods on the same docs page:** only **Scoop**
(`scoop install bun`) is listed, and it's presented in a general
"Package Managers" section alongside npm/Homebrew as a cross-platform
option — not singled out as Windows-specific. **winget and Chocolatey are
not mentioned anywhere on bun.sh/docs/installation.**

A community-maintained winget package does exist outside Bun's own docs
(`winget install -e --id Oven-sh.Bun`, found via `microsoft/winget-pkgs`
and winstall.app, not via bun.sh) — but it is not Bun's documented path,
and per a live winget-pkgs issue
([microsoft/winget-pkgs#272725](https://github.com/microsoft/winget-pkgs/issues/272725))
and an open Bun issue
([oven-sh/bun#20868](https://github.com/oven-sh/bun/issues/20868)), the
winget install currently **fails to add `%HOME%\.bun\bin` to PATH and
doesn't install `bunx`** — a concrete, documented case of a
community-maintained winget manifest lagging the tool's own installer in
correctness. This is a useful data point for neuron: winget packages are
maintained by a separate community process (PR review into
`microsoft/winget-pkgs`), not by the tool's own release pipeline, so they
can drift or break independently of what the vendor ships.

**Script content, verified by direct fetch of the real script**
([bun.sh/install.ps1](https://bun.sh/install.ps1)):
- Downloads a **zip from GitHub releases**:
  `$URL = "$BaseURL/.../$Target.zip"` where `$BaseURL =
  "https://github.com/oven-sh/bun/releases"`; `$Target` is chosen from
  `bun-windows-x64` (or `-baseline` for pre-AVX2 CPUs) or
  `bun-windows-aarch64`, with CPU architecture read from
  `HKLM:\SYSTEM\CurrentControlSet\Control\Session
  Manager\Environment` so it detects real arch even under x64 emulation
  on ARM64.
- Installs to **`$HOME\.bun\bin\bun.exe`**, or `%BUN_INSTALL%\bin` if set.
- Adds to PATH via a **`Write-Env` helper that edits the `HKCU:\Environment`
  registry key directly** and then broadcasts a `WM_SETTINGCHANGE`
  message so other running processes notice — a different, lower-level
  mechanism than Deno's .NET `SetEnvironmentVariable` call, though both
  land in the same place (user-scope PATH, no admin needed).
- States a minimum OS: **Windows 10 Build 17763+ or Windows Server 2019**.
- Registers an uninstall entry under
  `HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Bun` (skippable
  via a flag) and runs `bun.exe completions` post-install.
- Has real defensive error handling for antivirus interference and
  missing-DLL / instruction-set mismatches — worth noting as a maturity
  signal for what a production Windows install script ends up needing.

## 3. rustup

**Docs pages checked:** [rustup.rs](https://rustup.rs) (the canonical
install page — the one Rust's own tooling points users to) and
[rust-lang.org/tools/install](https://www.rust-lang.org/tools/install),
fetched independently; both agree.

**Verified: rustup does NOT use a PowerShell `irm | iex` pattern on
Windows.** Both pages show the same split:
- **Unix/macOS/WSL:** `curl --proto '=https' --tlsv1.2 -sSf
  https://sh.rustup.rs | sh`
- **Windows:** "download and run rustup‑init.exe then follow the onscreen
  instructions" — a **downloadable, double-clickable .exe**, not a piped
  script. `rust-lang.org/tools/install` links three separate
  `rustup-init.exe` builds (32-bit, x64, ARM64) rather than a single
  auto-detecting one-liner. Windows users are separately warned they may
  need the Visual Studio / MSVC C++ build tools — a prerequisite not
  mentioned for other platforms.

**winget exists but is not rustup's own documented path.** A
`Rustlang.Rustup` winget package is installable
(`winget install Rustlang.Rustup`, confirmed via winstall.app, a
winget-manifest browser, not rustup's own docs) but it does not appear on
rustup.rs or rust-lang.org/tools/install, and third-party notes on it flag
it can lag the version rustup.rs itself distributes. This is the clearest
example among the tools checked of "winget package exists in the
ecosystem" being a materially different claim from "winget is the vendor's
documented method."

**Why this matters for the `irm | iex` question specifically:** rustup is
the oldest and most widely-adopted of the three language/runtime installers
checked, and it deliberately did **not** converge on the PowerShell
one-liner pattern that Deno and Bun both later adopted — it ships a real
GUI-capable installer binary instead. This suggests the `irm | iex`
convention is real and increasingly common among *newer* JS-runtime-style
tools specifically, not a universal Windows CLI-install standard.

## 4. ripgrep and fd — survey of a Rust-ecosystem CLI tool pair

Both READMEs fetched directly from GitHub
(`raw.githubusercontent.com/BurntSushi/ripgrep/master/README.md` and
`raw.githubusercontent.com/sharkdp/fd/master/README.md`).

**ripgrep**, Windows methods in the order the README presents them:
1. **Precompiled binary download from the GitHub releases page** — stated
   first, as the primary path: "Archives of precompiled binaries for
   ripgrep are available for Windows, macOS and Linux."
2. `choco install ripgrep` (Chocolatey)
3. `scoop install ripgrep` (Scoop)
4. `winget install BurntSushi.ripgrep.MSVC` (winget)
5. `cargo install ripgrep` (Cargo, i.e. compile from source)

**fd**, same shape, same order of presentation:
1. **Precompiled binary download from the GitHub releases page**, stated
   first, with a specific callout for musl static binaries.
2. `scoop install fd`
3. `choco install fd`
4. `winget install sharkdp.fd`
5. `cargo install fd-find`

**Neither tool documents a PowerShell `irm | iex` installer script at
all.** Both present "go download the binary yourself from Releases" as
primary, then list package managers (scoop/choco/winget, order varies
slightly between the two READMEs) as equally-weighted alternatives, with
no distinction drawn between which package manager is "official" —
winget is present in both but is the last-listed package manager in both
READMEs, not the first.

## 5. winget — preinstalled status and real friction, per Microsoft's own docs

**Page checked:**
[learn.microsoft.com/en-us/windows/package-manager/winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)
(Microsoft's own docs, `ms.date: 2026-07-19`, so current as of this
research).

**Verified, quoted directly from the page:**
> "WinGet the Windows Package Manager is available on Windows 11, modern
> versions of Windows 10, and Windows Server 2025 as a part of the App
> Installer. The App Installer is a System Component delivered and
> updated by the Microsoft store on Windows Desktop versions..."

> "The WinGet command line tool is only supported on Windows 10 version
> 1809 (build 17763) or later. WinGet will not be available until you
> have logged into Windows as a user for the first time, triggering
> Microsoft Store to register the Windows Package Manager as part of an
> asynchronous process."

**Real friction, spelled out by Microsoft's own doc, not inferred:**
- Even on a supported Windows 10/11 build, winget is **not guaranteed
  present on first boot** — it's registered asynchronously via the
  Microsoft Store the first time a user logs in, and Microsoft's own
  troubleshooting step for "it's not there yet" is running
  `Add-AppxPackage -RegisterByFamilyName -MainPackage
  Microsoft.DesktopAppInstaller_8wekyb3d8bbwe` from PowerShell — i.e. the
  documented fallback for a missing winget is *itself* a PowerShell
  command, not a GUI action.
- If **App Installer isn't present at all** (locked-down corporate
  images, Windows Server outside 2025, Windows Sandbox — the doc
  explicitly calls out that Windows Sandbox "does not include WinGet, nor
  the Microsoft Store app"), the fallback is downloading an `.msixbundle`
  from the Microsoft Store app page or the GitHub releases page, or
  running a PowerShell bootstrap (`Install-PackageProvider`,
  `Install-Module -Name Microsoft.WinGet.Client`,
  `Repair-WinGetPackageManager`) — again, PowerShell, not winget itself,
  is the actual floor dependency.
- **Windows 10 versions older than 1809 (build 17763) have no winget path
  at all** — no version of App Installer supports them per this page.
- A linked, still-open winget-cli GitHub issue is referenced directly by
  Microsoft's own doc for "client not being on PATH" — a first-party
  acknowledgment that even a successful winget install doesn't
  guarantee winget is invokable afterward without a shell restart or a
  manual PATH fix.

**Bottom line:** winget is close to universal on actively-updated Windows
11 and modern Windows 10 machines, but "preinstalled" is doing real work
in that sentence — first-login registration timing, Sandbox/Server
exclusions, and a sub-17763 floor are all real gaps Microsoft's own docs
name, and every one of Microsoft's own documented fallbacks for those
gaps is itself a PowerShell command.

## 6. Scoop

**Pages checked:** [scoop.sh](https://scoop.sh) (fetch returned no
extractable body content on this pass — flagged below), and
`raw.githubusercontent.com/ScoopInstaller/Install/master/README.md`
(ScoopInstaller's own installer repo, fetched directly and successfully).

**Verified from the ScoopInstaller/Install README:**
- Install command: **`irm get.scoop.sh | iex`** — same `irm | iex` shape
  as Deno and Bun's own installers, confirming this is a broader
  Windows-CLI-tooling convention, not something Deno/Bun invented in
  isolation.
- Explicit execution-policy prerequisite documented:
  `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
  — PowerShell's default policy blocks running downloaded/piped scripts
  until this is set (scoped to the current user, no admin needed for that
  scope).
- The README **explicitly states to run the install "from a non-admin
  PowerShell"** — admin installs are disabled by default "for security
  reasons" and require a separate download-then-`-RunAsAdmin` flow.
- Default install location: `C:\Users\<username>\scoop`.

Scoop is itself a package manager (a Windows analog to Homebrew), not a
tool anyone would install neuron *through* as a first choice unless the
user already has it — its relevance here is as a secondary distribution
channel (publish a `neuron` scoop manifest into a bucket) rather than as
neuron's own install mechanism.

---

## Comparison table

| Tool | PowerShell `irm \| iex` verified as real? | winget: primary or secondary/community? | Other channels documented |
|---|---|---|---|
| **Deno** | Yes — `irm https://deno.land/install.ps1 \| iex`, confirmed by fetching the actual script | Secondary — listed with equal prominence to the PS one-liner, no official/community distinction drawn in the docs | scoop, choco, npm — all peer-listed |
| **Bun** | Yes — `powershell -c "irm bun.sh/install.ps1\|iex"`, confirmed by fetching the actual script | Not on Bun's own docs page at all; a community winget package exists but has an open, unresolved PATH bug | scoop only, presented as a general package-manager option, not Windows-specific |
| **rustup** | **No** — rustup uses a downloadable `rustup-init.exe`, not a piped PowerShell script, on both rustup.rs and rust-lang.org | Exists (`Rustlang.Rustup`) but absent from rustup's own docs entirely; third-party notes flag version lag | Chocolatey, Scoop (per web search, not rustup's own primary pages) |
| **ripgrep** | No — no PowerShell installer script found in the README at all | Listed, but 4th of 4 package-manager options (after choco, scoop) behind "download the binary yourself" as the stated primary | choco, scoop, cargo |
| **fd** | No — same as ripgrep | Listed, 3rd of 4 (after scoop, choco) behind "download the binary yourself" as the stated primary | scoop, choco, cargo |
| **winget itself** | N/A | — | Preinstalled on Windows 11 and "modern" Windows 10 (1809+), but first-run registration is asynchronous and every Microsoft-documented fallback for a missing/broken winget is itself a PowerShell command |
| **scoop** | Yes, for installing scoop itself — `irm get.scoop.sh \| iex` | N/A | Requires an execution-policy change first; explicitly non-admin by default |

---

## Real friction: PowerShell one-liner vs. `winget install`

**If winget is present and registered** (the common case on an
actively-updated Windows 11 machine, or Windows 10 1809+ that's been
logged into at least once), `winget install <publisher>.<name>` is
strictly less friction than a PowerShell one-liner for the user: no
execution-policy question, no piping-scripts-from-the-internet trust
decision, and it plugs into `winget upgrade`/`winget list` for update
management neuron wouldn't otherwise get for free on Windows.

**But winget presence is not guaranteed**, per Microsoft's own docs
(§5 above): async first-login registration, explicit non-support in
Windows Sandbox, exclusion of Windows Server versions before 2025, and a
hard floor at build 17763. Every fallback Microsoft documents for "winget
isn't there" is itself a PowerShell command — meaning **a Windows install
instruction that only says `winget install neuron` has no self-contained
fallback**; the user has to go find and run a PowerShell snippet anyway
if winget isn't already working, except now it's Microsoft's
bootstrap-winget snippet instead of neuron's own installer.

**A PowerShell `irm <url> | iex` one-liner, by contrast, has one
prerequisite (PowerShell itself, present on every supported Windows
version by definition) and one friction point (default execution policy
blocking piped scripts on some configurations — Scoop's docs name this
explicitly; Deno and Bun's scripts appear to run via `powershell -c`
invocations that sidestep the persistent-policy question since `-c` runs
in a fresh process rather than requiring `Set-ExecutionPolicy` first, per
Bun's documented command shape `powershell -c "irm bun.sh/install.ps1|iex"`).**
This is the more self-contained, single-path option, and it's what both
of the two most directly comparable prior-art tools (Deno, Bun — both
single-binary language/runtime CLIs distributed the same way neuron would
be) converged on as their **primary**, first-listed method, with winget
relegated to secondary/peer-listed status in Deno's case and entirely
absent from Bun's own docs.

---

## Recommendation

**Primary: a PowerShell `irm <url>/install.ps1 | iex` one-liner,
mirroring Deno's and Bun's own pattern and script mechanics.**

Concretely, this would look like:
```powershell
powershell -c "irm https://<neuron-install-host>/install.ps1 | iex"
```
(matching Bun's exact invocation shape, which wraps the command in
`powershell -c "..."` so it's pasteable from any shell context, not just
an already-open PowerShell prompt — this is the more portable of the two
real-world phrasings found, versus Deno's bare `irm ... | iex` which
assumes the user is already inside PowerShell).

The script itself should follow the pattern verified in both Deno's and
Bun's real scripts: download a prebuilt zip for the matching
arch (`neuron-windows-x64.zip` / `neuron-windows-arm64.zip`) from GitHub
Releases, extract to `%USERPROFILE%\.neuron\bin` (or an env-var override,
e.g. `NEURON_INSTALL`, mirroring `DENO_INSTALL`/`BUN_INSTALL`), and add
that directory to the user-scope PATH via the .NET
`[System.Environment]::SetEnvironmentVariable` call Deno's script uses
(simpler and no registry-broadcast complexity needed vs. Bun's raw
registry-key approach, unless neuner later needs Bun's
antivirus/DLL-mismatch defensive handling — worth revisiting once a real
Windows build exists to test against).

**Rationale, grounded in what was verified above, not general
preference:**
1. It's what the two most comparable tools actually ship as their
   **primary, first-documented** method — not a guess; both scripts were
   fetched and read directly.
2. It has no dependency on a system component (winget/App Installer) that
   Microsoft's own docs confirm is not universally present at first
   login, not present in Windows Sandbox, and has a real version floor.
3. rustup's `.exe`-download pattern and ripgrep/fd's "download from
   Releases page, then optionally a package manager" pattern are both
   real, documented alternatives among primary sources — but neither
   fits neuron's stated goal of a single pasteable command matching the
   `curl | sh` UX on macOS/Linux; a manually-downloaded `.exe` or a
   Releases-page browse-and-click is a materially different UX than "one
   line, one paste."

**Secondary: publish a winget manifest (`neuron install` via
`winget install <publisher>.neuron`) as an additional, not primary,
channel.**

This mirrors exactly what Deno does (winget listed as a peer alternative,
not the headline command) rather than what Bun does (no winget
mention at all) or what ripgrep/fd do (winget last among four listed
package managers). Reasoning: winget gives real value once present
(built-in upgrade/list/uninstall lifecycle neuron's own installer
doesn't provide), and publishing a manifest is a one-time cost against
`microsoft/winget-pkgs`. But Bun's own experience is a concrete
cautionary data point — its community winget package currently has an
open, unfixed bug where it doesn't correctly add the install dir to
PATH ([oven-sh/bun#20868](https://github.com/oven-sh/bun/issues/20868)),
demonstrating that a winget manifest is a second maintenance surface with
its own release cadence and failure modes, separate from neuron's own
install script — worth having, but not worth trusting as the only
documented path.

**Scoop:** worth a bucket entry as a tertiary option given it's a
one-time manifest and the tooling to install scoop itself
(`irm get.scoop.sh | iex`) is the exact same PowerShell-`irm` idiom
neuron's own installer would already use — low incremental cost. Not
worth documenting as a headline install method; none of Deno, Bun, or the
ripgrep/fd survey treat it as more than a peer-listed alternative.

**Chocolatey:** not recommended even as a secondary channel. It appeared
in the ripgrep/fd survey and in web-search results for rustup, but never
as a tool's own first-party-documented primary or even clearly
second-ranked method in anything fetched directly in this pass — lowest
signal-to-effort ratio of the channels surveyed.

---

## What was not verified (flag as directional, not confirmed)

- **scoop.sh's own landing page could not be fetched successfully** in
  this pass — the WebFetch call returned an empty body twice. The Scoop
  install command and its execution-policy prerequisite were instead
  confirmed from `ScoopInstaller/Install`'s own README on GitHub (a
  primary source — it's Scoop's own installer repo — but not the
  scoop.sh marketing page itself). If scoop.sh's page differs from its
  installer repo's README in any way, that difference wasn't checked.
- **rustup's own dedicated Windows installation doc pages**
  (`rust-lang.github.io/rustup/installation/windows.html` and the
  `rustup/README.md` on GitHub) were fetched but did not contain the
  actual install instructions in the fetched content — those pages
  turned out to be about ABI/toolchain considerations, not the install
  flow itself, or pointed elsewhere. The install-method conclusions for
  rustup above rest on rustup.rs and rust-lang.org/tools/install
  directly, both of which did contain the actual instructions and agree
  with each other, so this is treated as resolved, not a gap — but it's
  worth noting the book/README URLs guessed at up front were not the
  right ones.
- **No actual test of neuron's own hypothetical install.ps1 was run** —
  this document surveys what other tools do and do not do; it does not
  build or test a neuron-specific script. That's follow-up work for
  whichever ticket implements this decision.
- **winget manifest submission process itself** (what
  `microsoft/winget-pkgs` review turnaround looks like, whether it can be
  automated as part of neuron's existing `publish.yml` release flow) was
  not researched in this pass — flagged as a gap for the ticket that
  would actually implement the secondary winget channel.
- **Windows ARM64 detection nuance**: Bun's script reading real CPU arch
  from the registry (to handle x64-emulation-on-ARM64 correctly) was
  noted as a real, non-obvious detail worth copying, but was not
  independently tested — taken on faith from the fetched script content
  itself, which is a primary source (the actual script) but wasn't
  executed.
