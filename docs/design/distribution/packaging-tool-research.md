# Packaging-tool research: standalone binary for neuron

**Date:** 2026-08-17
**Submitted by:** research pass against primary sources (official docs,
GitHub repos/releases, npm registry, first-party benchmark repos) to feed
the "Curl-Installable Standalone Binary" effort's tool-selection decision —
see the effort's charter for the three tickets this research directly
unblocks: binary composition (whether to bundle native addons), the CI
build-matrix ticket, and the code-signing ticket.
**Status:** raw research, not yet adopted into a ticket decision. Findings
below are what was verifiable via WebFetch/WebSearch/GitHub API/npm
registry on 2026-08-17 — no sandboxed cross-compilation was actually run
(see "What was not verified" at the end); treat any specific number as
directional unless it's a direct quote from a primary source.

**Method note on primary-source-ness:** every maintenance-status and
mechanism claim below was checked against the tool's own repo (via `gh
api`, not cached knowledge), its own npm registry entry, or its own docs
page, not third-party roundups. Startup-time and binary-size numbers are
the exception — neither Node.js nor pkg/nexe publish first-party
benchmarks, so those figures come from a named, checkable third-party
benchmark repo (see §Bun and the comparison table), flagged as such.

---

## The question

Which tool should build neuron's standalone binary across six targets
(macOS x64/arm64, Linux x64/arm64, Windows x64/arm64), built in the same
`publish.yml` GitHub Actions run that already does the npm publish?

## Why it matters for this codebase specifically

neuron's two native dependencies are already optional, not required:
`package.json` lists `better-sqlite3` and `onnxruntime-node` under
`optionalDependencies`, and both have pure-JS/WASM fallbacks already
implemented — `src/db.ts`'s `openDatabase`/`createNodeSqliteWrapper` falls
back to `node:sqlite`'s `DatabaseSync` (Node >=22.5, and note
`package.json`'s `engines.node` is already pinned to `>=22.13.0`), and
`src/components/embedder.ts` falls back to `onnxruntime-web` (WASM) when
`onnxruntime-node` can't be resolved. Model weights are not bundled; they
download lazily via `env-paths` on first use. So the packaging tool does
not *need* native-addon support to ship a working binary today — but
Ticket 3 of this effort will separately decide whether to bundle the native
addons anyway for performance, so native-addon support is still scored
below as a real, weighted factor, not waved off.

---

## 1. Node.js Single Executable Applications (SEA)

**Maintenance status.** Built into Node.js core, actively developed —
`nodejs/node`'s repo shows a push as recent as 2026-08-17 (today, per `gh
api repos/nodejs/node`). The docs mark the feature stability as **"1.1 -
Active development"**
([nodejs.org/api/single-executable-applications](https://nodejs.org/api/single-executable-applications.html)).
Node v25.5.0 (shipped Jan 2026) added `--build-sea`, folding the
previously-external `postject` injection step into Node core — the
change's own author, Node.js TSC member Joyee Cheung, wrote the change was
needed in part because "`postject`... became unmaintained over three
years, creating debugging friction" under the old workflow
([joyeecheung.github.io, Jan 2026](https://joyeecheung.github.io/blog/2026/01/26/improving-single-executable-application-building-for-node-js/)).
The same post also flags real gaps: a virtual filesystem for packaged
resources "largely remained unfinished," and native-addon support in SEA
had "no documentation on how to use addons in SEA" until she wrote it up
during that work — i.e. the feature is maintained and moving, but not yet
fully mature.

**Native-addon support.** Documented, with a specific mechanism: addon
`.node` files are declared in the SEA config's `assets` map, embedded into
the executable's resource blob, extracted to a temp path at first launch,
and loaded via `process.dlopen()` on the extracted copy
([nodejs.org](https://nodejs.org/api/single-executable-applications.html)).
Known-broken case, stated verbatim in the docs: *"if the single-executable
application is produced by postject running on a Linux arm64 docker
container, the produced ELF binary does not have the correct hash table to
load the addons and will crash on `process.dlopen()`"* — the documented
workaround is building on non-container Linux arm64 or another platform.
This is directly relevant to neuron: a Linux-arm64 GitHub Actions runner
running inside a container image would hit exactly this.

**Cross-compilation.** Partially supported, with an explicit caveat in the
docs: *"When generating cross-platform SEAs (e.g., generating a SEA for
`linux-x64` on `darwin-arm64`), `useCodeCache` and `useSnapshot` must be
set to false to avoid generating incompatible executables... the generated
executable might crash on startup when trying to load code cache or
snapshots built on a different platform"*
([nodejs.org](https://nodejs.org/api/single-executable-applications.html)).
So cross-building is possible but forfeits the startup-time optimizations
those two flags exist for. Separately and more concerning for neuron's
six-target matrix: **the docs state CI tests macOS only on arm64** — *"macOS
(arm64 only; x64 is not currently supported and is skipped in the
tests)"* — meaning macOS x64 SEA output is untested by Node's own CI as of
this writing, a real risk for one of neuron's six required targets. Joyee
Cheung's post separately demonstrates building a Windows PE binary from a
Linux/macOS host is achievable using the LIEF library integration, so
Windows cross-build is workable in practice even where the stated support
matrix is narrower than desired.

**Binary size.** No first-party number published by Node.js docs. The
best available concrete figure is the third-party benchmark below (§Bun):
a Node SEA build of a synthetic ~500-module TS app came to **114.7 MB**
(117.1 MB with code cache) — this includes a full embedded Node binary,
which is the dominant size cost for any of these tools.

**Startup time.** No first-party Node.js benchmark. Per the same
third-party benchmark
([yyx990803/bun-vs-node-sea-startup](https://github.com/yyx990803/bun-vs-node-sea-startup)),
`node-sea` cold-start averaged **161.3 ms**, and `node-sea+code-cache`
**139.7 ms**, against plain `node script.js` not included in that specific
table but understood to be slower than the code-cache variant since code
cache exists specifically to skip re-parsing on every launch (per Node's
own docs, quoted above under maintenance status).

## 2. pkg — vercel/pkg is dead; @yao-pkg/pkg is the living fork

**Maintenance status.** The original `vercel/pkg` is confirmed archived:
`gh api repos/vercel/pkg` returns `"archived": true`, last push
2024-01-03. Its own README states: *"pkg has been deprecated with 5.8.1 as
the last release. There are a number of successful forked versions of pkg
already with various feature additions,"* and points at Node's own SEA
support as the forward path
([github.com/vercel/pkg](https://github.com/vercel/pkg)). Its npm listing
confirms `5.8.1` published 2023-03-08, nothing since
(`registry.npmjs.org/pkg`). The fork that inherited the ecosystem is
**`@yao-pkg/pkg`**, which self-describes as *"the actively maintained fork
of the archived `vercel/pkg`"*
([yao-pkg.github.io/pkg](https://yao-pkg.github.io/pkg/)). It is genuinely
active: `gh api repos/yao-pkg/pkg` shows a push 2026-07-30, and npm shows
`6.22.0` published 2026-07-30 with monthly releases visible back through
`6.21.0` (2026-06-30) and `6.19.0` (2026-04-24) — real, recent, regular
cadence, 51 open issues (small backlog relative to nexe, see below).

**Native-addon support.** Documented mechanism: pkg packages `.node` files
it can statically detect as assets in the snapshot filesystem; for
dynamically-resolved paths (e.g. via the `bindings` package) the addon
must be listed explicitly in `package.json`'s `assets` field. At runtime,
because native addons must exist as real files on disk, pkg extracts them
from the snapshot to `$HOME/.cache/pkg-native/` (overridable via
`PKG_NATIVE_CACHE_PATH`) on first launch and reuses the extracted copy on
subsequent runs
([yao-pkg.github.io/pkg/guide/native-addons](https://yao-pkg.github.io/pkg/guide/native-addons)).
Explicit known-broken case: *"Fully static Node binaries cannot load
native bindings. If your project uses `.node` addons, `linuxstatic` will
not work — use `linux` instead"* — directly relevant since a
`linuxstatic`/musl target would be a natural choice for a maximally
portable Linux binary but rules out bundling `better-sqlite3` or
`onnxruntime-node` compiled addons.

**Cross-compilation.** Explicitly supported and the strongest story of the
four for this factor: *"Cross-OS (Linux ↔ Windows ↔ macOS) and cross-arch
(x64 ↔ arm64) builds are supported"*
([yao-pkg.github.io/pkg/guide/targets](https://yao-pkg.github.io/pkg/guide/targets)) —
because pkg works by downloading a prebuilt Node binary for the target and
injecting a V8 snapshot, not by compiling anything, a single Linux CI
runner can genuinely produce all six of neuron's targets. Caveats: Node 22
in pkg's "Standard" mode is documented as producing "a broken executable"
for arm64 and Windows targets (a known regression, with the docs listing
workarounds including switching to "Enhanced SEA" mode, i.e. pkg's own
wrapper around Node's native SEA support, or disabling bytecode
compilation); and cross-arch bytecode generation on Linux requires
"configur[ing] binfmt with QEMU" in Standard mode. Native addons add a
second cross-compile constraint beyond the JS layer: the docs advise you
must "ensure the correct prebuilt binaries are installed for target
platforms, or rebuild them using `prebuildify` or `node-gyp`" — i.e. pkg
cross-compiling the *shell* doesn't cross-compile a native addon's `.node`
file for you; that's a separate problem neuron would inherit if Ticket 3
decides to bundle the addons.

**Binary size.** Not documented with a specific figure by yao-pkg's own
docs. Structurally comparable to Node SEA (both embed a full Node binary
plus a snapshot), so the ballpark from the §Bun benchmark's `node-sea`
figures (114–117 MB) is a reasonable proxy, not a pkg-specific
measurement — flagged as unverified for pkg specifically.

**Startup time.** No first-party or third-party benchmark found comparing
`@yao-pkg/pkg` output against plain `node`. Architecturally it should sit
close to Node SEA without code-cache (same snapshot-injection approach)
but this is inference, not a measured number — flagged as unverified.

## 3. nexe

**Maintenance status.** The weakest of the four, and effectively dormant
despite one recent commit. `gh api repos/nexe/nexe` shows `pushed_at:
2026-03-05` and 164 open issues, which sounds active at a glance — but the
actual commit on that date is `chore: refresh lint/dev deps (#1142)`, a
dependency-bump housekeeping commit, and the one before it is from
**2025-03-08**, a full year earlier. npm confirms the same picture: the
latest published version is `5.0.0-beta.4`, published **2025-03-08** —
seventeen months stale as of this research date, still in beta, no stable
5.x has ever shipped (`registry.npmjs.org/nexe`). GitHub's own Releases
list for the repo stops at `v3.3.3` (2017-08-30); newer versions since
were published to npm without a corresponding GitHub Release entry. 164
open issues against a project shipping roughly one maintenance commit per
year is a backlog that is not being worked down.

**Native-addon support.** Explicitly *not* handled by the tool — nexe's
own docs state plainly: *"In order to use native modules, the native
binaries must be shipped alongside the binary generated by nexe"*
([github.com/nexe/nexe](https://github.com/nexe/nexe)). That is not
addon-bundling, it's an instruction to distribute the `.node` file as a
separate sidecar file next to the executable — which defeats the "single
binary" premise the whole exercise is for, and is a materially weaker
mechanism than either Node SEA's asset-embedding or pkg's snapshot
extraction.

**Cross-compilation.** Not clearly documented as supported. nexe's target
spec accepts a `platform-arch-version` string (e.g.
`'windows-ia32-10.13.0'`) and states "each segment is optional, and will
be merged with the current environment" — implying targets are resolved
relative to the current host, and the README's actual build instructions
are platform-specific (separate Linux/macOS/Windows sections), not a
documented cross-build workflow. No explicit statement of "build on Linux,
produce a macOS binary" was found anywhere in the repo's own
documentation — this should be read as unsupported/unverified rather than
confirmed-working, which on its own is close to disqualifying for a matrix
that wants a single CI runner producing six targets.

**Binary size / startup time.** No figures published in nexe's own docs
or README, and no third-party benchmark was found that includes nexe
alongside Node SEA or Bun in this research pass. Given nexe also embeds a
full Node binary, a similar order of magnitude to pkg/Node SEA is a
reasonable guess but is unverified.

## 4. Bun `bun build --compile`

**Maintenance status.** By far the most active of the four, but note this
is a full alternate JS runtime, not a Node.js packaging tool — adopting it
means committing to Bun's Node-API-compatibility layer at runtime, not
just at build time. `gh api repos/oven-sh/bun` shows a push
**2026-08-17** (today) and 8,239 open issues (large absolute number, but
Bun is a full runtime/bundler/package-manager/test-runner, not a
single-purpose tool, so this isn't directly comparable to the others'
issue counts). Release cadence is real and frequent: npm's latest is
`1.3.14` (2026-05-13), and GitHub's releases list shows ten releases
between 2025-12-17 (`1.3.5`) and 2026-05-13 (`1.3.14`) — roughly monthly.

**Native-addon support.** Documented and working, with an important
caveat for cross-compilation. Bun's own docs confirm N-API addons can be
embedded: `require("./addon.node")` is bundled directly, with a warning
that *"if you're using `@mapbox/node-pre-gyp` or similar tools, require
the `.node` file directly, or it won't bundle correctly"*
([bun.sh/docs/bundler/executables](https://bun.sh/docs/bundler/executables)).
For cross-compiled targets, Bun "will bundle the prebuilt `.node` file
into the standalone build" — meaning, same as pkg, you must have (or
build, via prebuildify/node-gyp/GitHub Actions per-platform) the correct
platform-specific `.node` binary available at Bun's build time; Bun
doesn't compile the native addon for you, it only embeds whichever
prebuilt binary you hand it. This is functionally the same real
constraint as pkg's — it just moves neuron's actual bottleneck (getting
six platforms' worth of `better-sqlite3`/`onnxruntime-node` `.node`
binaries in one place) rather than removing it.

**Cross-compilation.** The most explicit and best-documented of the four.
Bun's own docs list eight `--target` values covering all combinations of
`{darwin, linux, windows} × {x64, arm64}` (linux also offers musl
variants), plus baseline/modern CPU-feature variants for x64, and state
compiling for any target from any host is supported: *"Use the `--target`
flag to compile your standalone executable for a different operating
system, architecture, or version of Bun than the machine you're running
`bun build` on"*
([bun.sh/docs/bundler/executables](https://bun.sh/docs/bundler/executables)).
This started as a feature request
([oven-sh/bun#7950](https://github.com/oven-sh/bun/issues/7950), closed
via PR #10477) and is now first-party documented, not a workaround. Of the
four tools, this is the only one whose own docs state outright that one
host can produce all six of neuron's targets with no documented per-target
regression (contrast pkg's Node-22-arm64/Windows regression above).

**Binary size.** Bun's own docs acknowledge the executable is large and
flag it as an open problem in their own tooling notes: *"Bun's binary is
still way too big and we need to make it smaller"*
([bun.sh/docs/bundler/executables](https://bun.sh/docs/bundler/executables)) —
a first-party admission, not a criticism from outside. Concretely, in the
third-party benchmark below, a compiled synthetic app came to **60.2 MB**
plain / **83.0 MB** with `--bytecode` — smaller than the Node SEA
equivalent (114–117 MB) but still large in absolute terms, because it
embeds the entire Bun runtime.

**Startup time.** This is Bun's strongest documented advantage. The most
concrete, checkable comparison found is a benchmark repo published by Evan
You (creator of Vue/Vite, an independent, credible third party — not
Bun's own marketing) directly comparing Node SEA and Bun-compiled output
on the same synthetic ~500-module TypeScript codebase, using Hyperfine
over 30 runs each
([github.com/yyx990803/bun-vs-node-sea-startup](https://github.com/yyx990803/bun-vs-node-sea-startup)):

| Variant | Mean startup | Binary size |
|---|---|---|
| `bun-compile+bytecode` | 111.0 ms ± 0.6 | 83.0 MB |
| `node-sea+code-cache` | 139.7 ms ± 0.7 | 117.1 MB |
| `node-sea` | 161.3 ms ± 1.4 | 114.7 MB |
| `bun-compile` (no bytecode) | 189.9 ms ± 2.0 | 60.2 MB |

Bun's own docs make a narrower, first-party claim in the same direction
without a specific number: bytecode compilation "moves parsing overhead
for large input files from runtime to bundle time. Your app starts
faster, in exchange for making the `bun build` command a little slower"
([bun.sh/docs/bundler/executables](https://bun.sh/docs/bundler/executables)).
Widely repeated marketing figures like "Bun starts 4x faster" or "8–15 ms
cold start" appear across secondary blog content (daily.dev, tech-insider,
strapi.io, etc.) but were **not** traced to a bun.sh-owned page in this
pass — those specific numbers should be treated as unverified marketing
paraphrase, not confirmed. The Evan You benchmark above is the only
number in this document that both (a) has a public, inspectable
methodology and (b) directly compares the two tools most relevant to
neuron's actual decision.

---

## Comparison table

| Factor | Node SEA | @yao-pkg/pkg | nexe | Bun `--compile` |
|---|---|---|---|---|
| **Maintenance (2026)** | Active, in Node core; feature itself still maturing (VFS unfinished) | Active fork, monthly releases (`6.22.0`, 2026-07-30), small issue backlog | Dormant — latest is a 17-month-old beta (`5.0.0-beta.4`), ~1 maintenance commit/year, 164 open issues | Very active, ~monthly releases, but it's a full alternate runtime, not just a packager |
| **Native addons** | Supported: asset-embed + `process.dlopen()`; documented Linux-arm64-container crash | Supported: snapshot-embed + extract-to-cache; broken on `linuxstatic`/musl | Not bundled — docs say ship the `.node` file as a **separate sidecar**, defeats "single binary" | Supported: bundles a prebuilt `.node` you supply; same "must have the right prebuilt per target" constraint as pkg |
| **Cross-compilation (1 CI runner → 6 targets)** | Partial — works, but forces off `useCodeCache`/`useSnapshot`; macOS x64 explicitly untested in Node's own CI | Yes, explicitly documented for all OS×arch combos, with a known Node-22 regression on arm64/Windows in one mode | Not documented as supported; README gives per-host build steps only | Yes, most explicit of the four — 8 documented `--target` values, one host can build all six |
| **Binary size (proxy benchmark)** | ~115–117 MB | Unverified; structurally similar to SEA (full Node binary + snapshot) | Unverified; likely similar order of magnitude | 60–83 MB; Bun's own docs call their binary "still way too big" |
| **Startup time (proxy benchmark)** | 139.7–161.3 ms | Unverified (no benchmark found) | Unverified (no benchmark found) | 111.0–189.9 ms; fastest variant when `--bytecode` is used |

---

## Recommendation

**Short-list: Node SEA and `@yao-pkg/pkg`. Eliminate nexe outright. Treat
Bun as a longer-term option, not this ticket's answer.**

**nexe is disqualified** on maintenance status alone — a 17-month-stale
beta release, one dependency-bump commit in the last year, no documented
cross-compilation story, and a native-addon story that's a sidecar-file
instruction rather than real bundling. None of the other three factors
matter if the tool itself isn't reliably maintained.

**Bun is the fastest and (per its own docs) the best cross-compilation
story of the four**, and its native-addon mechanism is real, not a
sidecar hack. But it is disqualified as *this* ticket's pick for one
structural reason none of the benchmarks change: **shipping via
`bun build --compile` means neuron runs on Bun's runtime in production,
not Node's** — every `node:sqlite` fallback, every `onnxruntime-node`/
`onnxruntime-web` fallback path, and any future native-addon decision from
Ticket 3 would need to be re-verified against Bun's Node-API compatibility
layer rather than actual Node.js, adding a second runtime to support
indefinitely for a codebase whose entire fallback architecture (per
`src/db.ts` and `src/components/embedder.ts`) was designed and tested
against real Node. That's a materially different, larger bet than a
packaging-tool swap. Worth revisiting later if neuron ever considers Bun
as a runtime target in its own right — not worth taking on as a side
effect of a binary-distribution ticket.

**Between the remaining two, `@yao-pkg/pkg` is the stronger fit for the CI
build-matrix ticket specifically**, because its docs make the single
clearest first-party claim that one Linux runner can cross-build all six
targets today: *"Cross-OS (Linux ↔ Windows ↔ macOS) and cross-arch (x64 ↔
arm64) builds are supported"*
([yao-pkg.github.io](https://yao-pkg.github.io/pkg/guide/targets)) — Node
SEA's own docs, by contrast, explicitly state macOS x64 (one of neuron's
six required targets) is *not currently tested* on Node's own CI, and
cross-platform SEA generation forces off the two flags that make SEA
startup competitive in the first place.

**The deciding tradeoff, spelled out:** pkg wins today on cross-compile
convenience (proven six-target-from-one-runner story, smaller CI bill,
fewer moving parts) but is a third-party layer whose upstream (Node's own
SEA support) is where the underlying platform's own vendor is actively
investing — Node SEA is younger and rougher (unfinished VFS, undocumented
addon story until January 2026, no macOS-x64 CI coverage yet) but is the
thing pkg itself is now built partly *on top of* (yao-pkg's own "Enhanced
SEA" mode literally wraps Node's native SEA support), and it's the one
option with no dependency on a third-party maintainer staying active.
**Recommendation: pick `@yao-pkg/pkg` for the binary-composition and
CI-matrix tickets now**, since it is the only tool whose own docs make an
unqualified, unconditional cross-compile claim across all six targets
today, **but track Node SEA's maturity explicitly** (the VFS work and
macOS x64 CI coverage in particular) as a migration candidate once those
gaps close, given pkg's own README already points the same direction. This
also composes cleanly with Ticket 3's still-open native-addon question:
whichever way that ticket lands, pkg's snapshot-extraction mechanism
handles both outcomes (WASM-only build, or native-addon-bundled build)
without a tooling change.

---

## What was not verified (flag as directional, not confirmed)

- **No actual cross-compilation was run.** All cross-platform claims above
  are the tools' own documentation, not a build-matrix job this research
  executed. In particular, pkg's claimed macOS/Windows-from-Linux builds
  and Bun's `--target` builds were not smoke-tested against neuron's
  actual dependency tree (`web-tree-sitter`, `@huggingface/transformers`,
  `onnxruntime-web`, plus the two optional native addons).
- **pkg's and nexe's binary-size and startup-time numbers are proxies**,
  not tool-specific measurements — no benchmark comparing pkg or nexe
  output against Node SEA/Bun was found in this pass. If either tool is
  carried forward, get real numbers from a spike before committing to the
  CI-matrix ticket's runner sizing/cache strategy.
- **The widely-repeated "Bun starts 4–10x faster than Node" marketing
  figures were not traced to a bun.sh-owned source** in this pass — only
  the narrower, methodology-disclosed Evan You benchmark (111–190 ms
  range) and Bun's own qualitative bytecode claim were confirmed
  first-party or independently reproducible.
- **Native-addon bundling was not tested against neuron's actual addons.**
  All native-addon mechanism descriptions above are the tools' own docs;
  none were verified by actually embedding `better-sqlite3`'s or
  `onnxruntime-node`'s real `.node` files and running the resulting binary
  cross-platform. This should be the first thing Ticket 3 does if it
  decides to bundle native addons.
- **yao-pkg's exact commit-activity trend** (issue backlog trajectory over
  time, not just the current 51-open-issue snapshot) was not analyzed —
  only current-state figures were pulled via `gh api`, not a historical
  trend.
