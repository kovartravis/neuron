# CI build matrix: packaging the standalone binary

**Date:** 2026-08-17
**Resolves:** Ticket 5 (Extend `publish.yml` — CI build matrix) of the
"Curl-Installable Standalone Binary" map.
**Status:** implemented and locally verified (host target: macOS arm64,
`@yao-pkg/pkg` 6.22.0). The other 5 targets use the identical mechanism —
pkg's own docs claim genuine one-Linux-runner cross-compilation across all
six OS/arch combos (Ticket 1's research) — but were not individually
smoke-tested locally, only through the CI matrix definition itself.

## What Ticket 1's research didn't cover, and turned out to matter

`docs/design/distribution/packaging-tool-research.md` flagged, under "What
was not verified," that no actual build had been run against neuron's real
dependency tree. Doing that build for this ticket surfaced two real,
load-bearing findings neither the research pass nor Ticket 3's grilling
could have caught from documentation alone:

1. **`@yao-pkg/pkg` has no working ESM entry-point support.** Pointing pkg
   directly at `dist/cli.js` (a real ESM file — `package.json` sets `"type":
   "module"`, `tsconfig.json` targets `NodeNext`) fails at runtime with
   `Cannot find package '@huggingface/transformers'` even though the same
   file runs correctly under plain `node`. The root cause: pkg's snapshot
   filesystem doesn't correctly resolve conditional `"exports"` maps for
   packages that have no fallback `"main"` (transformers.js is exports-only;
   its `main` field points at a source file the published package doesn't
   even ship). This matches the long-standing, still-open
   [vercel/pkg#1291](https://github.com/vercel/pkg/issues/1291) "ES modules
   not supported" — `@yao-pkg/pkg` inherited the limitation from its
   upstream, its own docs don't call this out.

2. **`onnxruntime-node`'s native binding can't be made to load inside a pkg
   snapshot**, even when its directory is listed explicitly as a pkg asset.
   `binding.js` resolves its `.node` file via a *computed* `path.join()`,
   and pkg's own runtime error is explicit about the limit: *"was not
   included into executable at compilation stage... specify a literal in
   'require' call."* Patching `require.cache` to preempt the load (the
   existing Android/Termux shim's approach — see below) does not help
   either: it doesn't propagate into pkg's own module loader for
   snapshot-packaged `node_modules` dependencies.

## The pipeline that works

1. **Pre-bundle `dist/cli.js` to a single CommonJS file with esbuild**
   before handing it to pkg, rather than pointing pkg at the ESM output
   directly. esbuild does its own correct `"exports"`-map resolution at
   bundle time, sidestepping pkg's broken runtime resolution entirely —
   confirmed by testing the CJS bundle under plain `node` first (works),
   then under pkg (also works, once the two fixes below are applied).
2. **`import.meta.url` has no CJS equivalent**, and esbuild's CJS output
   leaves it an empty object with only a warning, silently breaking every
   `createRequire(import.meta.url)` call (`db.ts`, `embedder.ts`,
   `generator.ts`) — needs esbuild's standard shim:
   `--define:import.meta.url=import_meta_url` plus a
   `--banner:js="const import_meta_url = require('url').pathToFileURL(__filename).href;"`.
3. **`better-sqlite3` and `onnxruntime-node` stay `--external`** to the
   esbuild bundle (native addons can't be inlined as JS) and are staged as
   real files pkg can find and snapshot-extract:
   - `better-sqlite3`: `prebuild-install --platform <p> --arch <a> --target
     22.13.0` (the embedded pkg Node's ABI, *not* the CI host's own Node
     version — the two can differ and produce the wrong
     `NODE_MODULE_VERSION`). Downloads a real prebuilt from
     WiseLibs/better-sqlite3's GitHub Releases; **confirmed working** for
     both the host target (macOS arm64) and a cross-target fetch
     (Linux x64, tested from a macOS host).
   - `onnxruntime-node`: its own npm package already ships prebuilt
     binaries for all 6 target combos inside `bin/napi-v3/<platform>/
     <arch>/` (Ticket 3's finding) — no download needed, just an explicit
     pkg asset glob for the one matching the current target.
4. **pkg assets are declared via a generated `pkg.config.json`** (`-c`/
   `--config`), not CLI flags — pkg 6.x has no `--assets` flag; assets are
   config-file-only.

`scripts/build-binary.mjs` implements all four steps, invoked as
`npm run build:binary -- <target>` where `<target>` is one of
`macos-x64`/`macos-arm64`/`linux-x64`/`linux-arm64`/`windows-x64`/
`windows-arm64`.

## Accepted gap: WASM-only ML backend in the packaged binary

Given finding 2 above, the packaged binary cannot use `onnxruntime-node`
(native) the way Ticket 3 intended — `better-sqlite3` bundles and loads
correctly, but every ONNX-backed component (embeddings, reranking, NLI
polarity, summarization) fails its native-addon `require` at runtime.

This does **not** crash the binary. neuron's write path already tolerates a
failed vector-index step — the entry still gets created, and the warning
says the vector index "will reconcile from markdown on next command."
Verified live: `memory add` against the packaged binary returns
`{"status": "created"}` with a printed warning, not an error exit.

Two things were tried and explicitly did **not** fix the root cause, so
they're recorded here rather than left to be re-discovered:

- Extending the existing `process.platform === 'android'` WASM-forcing
  shim (`src/shared/crossPlatformShims.ts`, née duplicated across
  `embedder.ts`/`generator.ts`) to also trigger on `process.pkg` (which pkg
  does set on the packaged binary) — the `require.cache` monkeypatch this
  shim relies on doesn't reach `transformers.node.cjs`'s own
  `require("onnxruntime-node")` inside pkg's module system. Reverted; see
  the shim's own doc comment.
- Adding `reranker.ts`/`nliClassifier.ts` to the shim's call sites (they
  were missing it even for the pre-existing Android case — a real,
  independent consistency bug, now fixed) did not change the pkg-specific
  outcome either, though it's a legitimate fix on its own merits.

**Consequence for this distribution channel specifically:** semantic
search, reranking, and NLI-gated writes run without native ONNX Runtime
acceleration in the curl-installed binary — the `npm install` path is
completely unaffected, since it never goes through pkg's snapshot fs.
Making the ONNX backend work natively inside a pkg-packaged binary (e.g. by
patching pkg's own snapshot loader, vendoring a patched `binding.js` that
takes a literal require path, or dropping to WASM-only by design rather
than by accident) is unscheduled follow-up — same posture Ticket 4 already
set for code signing: a known, accepted v1 rough edge, not a blocker.
