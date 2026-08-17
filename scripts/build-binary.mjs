#!/usr/bin/env node
// Builds one standalone `neuron` executable via @yao-pkg/pkg, for the
// curl-installable-binary effort's CI build matrix (ticket 5).
//
// pkg has no working ESM entry-point support (confirmed live against this
// codebase's real dependency tree, not just pkg's docs) — package.json's
// conditional "exports" maps resolve incorrectly inside its snapshot fs, and
// an ESM entry file (even bytecode-disabled) fails to resolve at runtime.
// The fix is to pre-bundle dist/cli.js to a single CJS file with esbuild
// (which does its own, correct exports resolution at bundle time) and hand
// pkg that instead. import.meta.url (used by db.ts/embedder.ts/generator.ts/
// harness.ts for createRequire/asset-path resolution) has no CJS equivalent,
// so esbuild's output needs the standard --define/--banner shim below.
//
// better-sqlite3 and onnxruntime-node stay --external to the bundle (native
// addons can't be bundled as JS) and are staged as real files next to the
// entry so pkg's own native-addon detection can snapshot-and-extract them:
// better-sqlite3 via `prebuild-install` targeting the embedded Node's ABI,
// onnxruntime-node from its own npm package's bundled prebuilt binaries
// (bin/napi-v3/<platform>/<arch>/, already present after `npm ci`, all 6
// targets ship inside the one npm package).
//
// Known accepted gap (see docs/design/distribution/ci-build-matrix.md):
// onnxruntime-node's binding.js resolves its .node file via a *computed*
// path.join(), which pkg's snapshot fs can't dlopen() even when the file is
// listed as a pkg asset. The packaged binary still works — a failed
// vector-index write doesn't fail the overall command, and reconciles from
// markdown on the next command — but semantic search/embeddings run without
// native ONNX Runtime acceleration in the curl-install binary specifically
// (the npm install path is unaffected). Fixing this for real is unscheduled
// follow-up work, not this ticket's scope.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const PKG_NODE = 'node22'; // matches package.json's engines.node >=22.13.0 (node:sqlite fallback needs it)
const PREBUILD_TARGET = '22.13.0';

const TARGETS = {
  'macos-x64': { pkgPlatform: 'macos', platform: 'darwin', arch: 'x64' },
  'macos-arm64': { pkgPlatform: 'macos', platform: 'darwin', arch: 'arm64' },
  'linux-x64': { pkgPlatform: 'linux', platform: 'linux', arch: 'x64' },
  'linux-arm64': { pkgPlatform: 'linux', platform: 'linux', arch: 'arm64' },
  'windows-x64': { pkgPlatform: 'win', platform: 'win32', arch: 'x64' },
  'windows-arm64': { pkgPlatform: 'win', platform: 'win32', arch: 'arm64' }
};

const name = process.argv[2];
const target = TARGETS[name];
if (!target) {
  console.error(`Usage: build-binary.mjs <${Object.keys(TARGETS).join('|')}>`);
  process.exit(1);
}

const buildDir = path.join(repoRoot, 'pkgbuild');
const outDir = path.join(repoRoot, 'dist-bin');
fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const bundlePath = path.join(buildDir, 'cli.cjs');
const exe = target.platform === 'win32' ? '.exe' : '';
const outputName = `neuron-${name}${exe}`;
const outputPath = path.join(outDir, outputName);

function run(cmd, args, opts = {}) {
  console.log(`+ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: repoRoot, ...opts });
}

// 1. Pre-bundle to a single CJS file (see module comment for why CJS).
run(path.join(repoRoot, 'node_modules/.bin/esbuild'), [
  path.join(repoRoot, 'dist/cli.js'),
  '--bundle',
  '--platform=node',
  '--target=node22',
  '--format=cjs',
  `--outfile=${bundlePath}`,
  '--external:better-sqlite3',
  '--external:onnxruntime-node',
  '--external:node:sqlite',
  '--define:import.meta.url=import_meta_url',
  "--banner:js=const import_meta_url = require('url').pathToFileURL(__filename).href;"
]);

// 2. Stage better-sqlite3's native binding for the target platform/arch —
// downloads a prebuilt from WiseLibs/better-sqlite3's GitHub Releases,
// targeting the ABI the pkg-embedded node22 base uses (not the CI host's
// own Node version, which can differ from PREBUILD_TARGET).
run(process.execPath, [
  path.join(repoRoot, 'node_modules/.bin/prebuild-install'),
  '--platform', target.platform,
  '--arch', target.arch,
  '--target', PREBUILD_TARGET,
  '--verbose'
], { cwd: path.join(repoRoot, 'node_modules/better-sqlite3') });

// 3. pkg config: explicit assets for the native binaries so pkg's own
// native-addon snapshot-and-extract mechanism picks them up (see module
// comment for onnxruntime-node's known remaining gap).
const pkgConfigPath = path.join(buildDir, 'pkg.config.json');
fs.writeFileSync(
  pkgConfigPath,
  JSON.stringify(
    {
      assets: [
        'node_modules/better-sqlite3/build/Release/*.node',
        `node_modules/onnxruntime-node/bin/napi-v3/${target.platform}/${target.arch}/**`
      ]
    },
    null,
    2
  )
);

// 4. Package.
run(path.join(repoRoot, 'node_modules/.bin/pkg'), [
  bundlePath,
  '-t', `${PKG_NODE}-${target.pkgPlatform}-${target.arch}`,
  '-o', outputPath,
  '--public',
  '--config', pkgConfigPath
]);

if (target.platform !== 'win32') {
  fs.chmodSync(outputPath, 0o755);
}

console.log(`Built ${outputPath}`);
