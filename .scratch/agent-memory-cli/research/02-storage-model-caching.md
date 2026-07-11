# Storage & Model Caching Research: `neuron` CLI

**Research date:** 2026-07-11  
**Scope:** OS-specific app data directories, on-disk layout, Transformers.js caching configuration, first-run UX, and cold-start latency strategy.

---

## 1. OS-Specific App Data Directories

### Platform conventions

| OS | Data directory | Cache directory |
|---|---|---|
| **macOS** | `~/Library/Application Support/<app>` | `~/Library/Caches/<app>` |
| **Linux** | `$XDG_DATA_HOME/<app>` (default: `~/.local/share/<app>`) | `$XDG_CACHE_HOME/<app>` (default: `~/.cache/<app>`) |
| **Windows** | `%LOCALAPPDATA%\<app>\Data` | `%LOCALAPPDATA%\<app>\Cache` |

**Sources:**
- macOS: [Apple File System Programming Guide — Library Directory](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html) — `~/Library/Application Support` is the canonical location for application data on macOS.
- Linux: [XDG Base Directory Specification — freedesktop.org](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) — `$XDG_DATA_HOME` (default `~/.local/share`) for persistent user data; `$XDG_CACHE_HOME` (default `~/.cache`) for non-essential/regenerable cache. Environment variables must be set to absolute paths if present; if not set, fall back to the stated defaults.
- Windows: `%LOCALAPPDATA%` (typically `C:\Users\<User>\AppData\Local`) is preferred over `%APPDATA%` (Roaming) for local-only data like models and databases — roaming data is synced across domain computers, which is inappropriate for large binary model files. Source: [Microsoft Windows App Data documentation](https://learn.microsoft.com/en-us/windows/win32/shell/knownfolderid).

### Recommended npm package: `env-paths`

**Package:** [`env-paths`](https://github.com/sindresorhus/env-paths) by Sindre Sorhus  
**npm:** `npm install env-paths`  
**Version at time of research:** v3.x (ESM-only)

`env-paths` is the de-facto standard Node.js library for resolving OS-correct app data paths. It returns an object with `data`, `cache`, `config`, `log`, and `temp` properties, each pointing to the correct OS-specific directory.

```typescript
import envPaths from 'env-paths';

const paths = envPaths('neuron', { suffix: '' }); // suffix: '' avoids appending '-nodejs'

// macOS:  ~/Library/Application Support/neuron
// Linux:  ~/.local/share/neuron  (or $XDG_DATA_HOME/neuron)
// Windows: %LOCALAPPDATA%\neuron\Data
console.log(paths.data);

// macOS:  ~/Library/Caches/neuron
// Linux:  ~/.cache/neuron  (or $XDG_CACHE_HOME/neuron)
// Windows: %LOCALAPPDATA%\neuron\Cache
console.log(paths.cache);
```

**Important notes:**
- By default, `env-paths` appends `-nodejs` to the name (e.g., `neuron-nodejs`). Pass `{ suffix: '' }` to disable this and get a cleaner directory name (`neuron`). Source: [sindresorhus/env-paths README](https://github.com/sindresorhus/env-paths#readme).
- The package **does not create directories** — call `fs.mkdir(path, { recursive: true })` before writing. Source: same README.
- On Linux, `env-paths` correctly reads `$XDG_DATA_HOME` and `$XDG_CACHE_HOME` if set, falling back to `~/.local/share` and `~/.cache` respectively. Source: [env-paths source](https://github.com/sindresorhus/env-paths/blob/main/index.js).
- On Windows, `paths.data` maps to `%LOCALAPPDATA%\<name>\Data` — NOT `%APPDATA%` (Roaming). This is correct behavior: large binary model files must not roam across domain machines. Source: [sindresorhus/env-paths source](https://github.com/sindresorhus/env-paths/blob/main/index.js).

---

## 2. Proposed On-Disk Layout

### Directory tree

```
# macOS
~/Library/Application Support/neuron/
  models/
    Xenova/
      bge-small-en-v1.5/            ← Transformers.js cache subtree (managed by library)
        onnx/
          model_quantized.onnx      ← ~34 MB (q8)
          model_quantized.onnx_data
        tokenizer.json
        tokenizer_config.json
        config.json
        special_tokens_map.json
  db/
    <sha256-of-project-root>.sqlite  ← per-project SQLite database

# Linux (XDG)
~/.local/share/neuron/
  models/
    Xenova/
      bge-small-en-v1.5/
        ...
  db/
    <sha256-of-project-root>.sqlite

# Windows
%LOCALAPPDATA%\neuron\Data\
  models\
    Xenova\
      bge-small-en-v1.5\
        ...
  db\
    <sha256-of-project-root>.sqlite
```

### Why a single `data` root (not separate `data` + `cache`)

Both the SQLite DB and the ONNX model files are durable, persistent, and not safely regenerable without user action. Placing them under `cache` would be incorrect because cache directories can be cleared by OS cleanup tools (`brew cleanup`, `cleanmgr`, etc.) without warning. Both artifacts belong under `paths.data`. Source: [XDG spec §2 — "Non-essential (cached) data"](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) — "it might be cleared out after each session."

### Keying the per-project SQLite database

Each `npx neuron` invocation auto-detects the project root by walking up the directory tree from `process.cwd()` looking for `package.json` or a `.git` directory. The absolute path of that root is hashed with SHA-256 (hex, truncated to 16 chars for readability) to produce the DB filename.

```typescript
import crypto from 'node:crypto';

function projectDbName(projectRoot: string): string {
  return crypto
    .createHash('sha256')
    .update(projectRoot)
    .digest('hex')
    .slice(0, 16);
  // e.g., "a3f8c1d2e4b56789.sqlite"
}
```

**Trade-offs of path-based hash:**
- ✅ Zero config — fully automatic, no manifest needed
- ✅ Deterministic and stable as long as the project doesn't move
- ⚠️ Breaks if user renames/moves the project directory — the old DB becomes orphaned. An orphan-cleanup command (`neuron db prune`) can be provided later.
- Alternative: Store `projectId` in the project's `package.json` or a `.neuron` config file. More robust to moves, but requires user-visible config. Path hash is better for a zero-config first version.

Source: [Node.js `crypto` module docs](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options).

---

## 3. Transformers.js Model Caching

### Library and version

`@huggingface/transformers` v3 (the official package; `@xenova/transformers` is the v2 legacy name).  
Source: [Hugging Face Transformers.js v3 migration guide](https://huggingface.co/docs/transformers.js/en/guides/migrating_from_v2).

### Relevant `env` properties

All are imported from `@huggingface/transformers`:

```typescript
import { env } from '@huggingface/transformers';
```

| Property | Type | Default (Node.js) | Description |
|---|---|---|---|
| `env.cacheDir` | `string` | `'./.cache'` (relative to CWD) | Directory for filesystem-cached model downloads |
| `env.useFSCache` | `boolean` | `true` | Enable/disable filesystem cache in Node.js |
| `env.allowRemoteModels` | `boolean` | `true` | Allow downloading from Hugging Face Hub |
| `env.allowLocalModels` | `boolean` | `true` | Allow loading from `env.localModelPath` |
| `env.localModelPath` | `string` | `'/models/'` | Path for pre-bundled/local model files |

**Source:** [Transformers.js API reference — `env`](https://huggingface.co/docs/transformers.js/en/api/env); [GitHub: huggingface/transformers.js src/env.js](https://github.com/huggingface/transformers.js/blob/main/src/env.js).

**Critical finding — default `cacheDir`:**  
Unlike the Python `transformers` library (which defaults to `~/.cache/huggingface/hub` via `HF_HOME`), Transformers.js v3 defaults `env.cacheDir` to **`'./.cache'` — a relative path under CWD**. This means without explicit configuration, each project would get its own `.cache/` folder at whatever directory the user ran `npx neuron` from — incorrect behavior for a shared CLI tool. **Explicitly setting `env.cacheDir` to the OS app-data path is mandatory.** Source: [Transformers.js docs](https://huggingface.co/docs/transformers.js/en/api/env).

### How to configure the cache directory

Set `env.cacheDir` before calling `pipeline()` or any model-loading function:

```typescript
import { env, pipeline } from '@huggingface/transformers';
import envPaths from 'env-paths';
import path from 'node:path';

const appPaths = envPaths('neuron', { suffix: '' });
const modelCacheDir = path.join(appPaths.data, 'models');

// Point Transformers.js at our app-scoped data directory
env.cacheDir = modelCacheDir;
env.useFSCache = true;
```

Transformers.js will then cache model files under `<modelCacheDir>/Xenova/bge-small-en-v1.5/` (maintaining the HuggingFace Hub directory structure). Source: [Transformers.js Node.js usage guide](https://huggingface.co/docs/transformers.js/en/guides/node-js-usage).

### Offline enforcement after first download

After the model files are confirmed cached on disk, set:

```typescript
env.allowRemoteModels = false;
```

This prevents any network calls to the HuggingFace Hub, ensuring subsequent runs are fully offline. Source: [Transformers.js `env` API](https://huggingface.co/docs/transformers.js/en/api/env).

**Detection pattern — is the model already cached?**

Check for the presence of the ONNX file before attempting to load:

```typescript
import fs from 'node:fs';
import path from 'node:path';

function isModelCached(cacheDir: string, modelId: string): boolean {
  // Transformers.js stores files at: <cacheDir>/<modelId>/onnx/model_quantized.onnx
  const onnxPath = path.join(cacheDir, modelId, 'onnx', 'model_quantized.onnx');
  return fs.existsSync(onnxPath);
}

const MODEL_ID = 'Xenova/bge-small-en-v1.5';
const cached = isModelCached(modelCacheDir, MODEL_ID);

if (cached) {
  env.allowRemoteModels = false; // enforce offline mode
}
```

---

## 4. First-Run Model Download UX

### The problem

On the first `npx neuron <command>`, the model is not cached. Downloading `model_quantized.onnx` (~34 MB) takes 3–15 seconds depending on connection speed. The download must:
1. Not block stdout (stdout is reserved for JSON output)
2. Provide human-readable progress on stderr
3. Silently degrade when stderr is not a TTY (piped harness, CI)

### `progress_callback` in Transformers.js

`pipeline()` accepts a `progress_callback` option:

```typescript
const pipe = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
  dtype: 'q8',
  progress_callback: (info) => {
    // info.status: 'initiate' | 'download' | 'progress' | 'done' | 'ready'
    // info.file: string (filename being downloaded)
    // info.loaded: number (bytes loaded)
    // info.total: number (total bytes)
    // info.progress: number (0–100)
  }
});
```

Source: [Transformers.js pipeline API](https://huggingface.co/docs/transformers.js/en/api/pipelines#module_pipelines.pipeline).

### Recommended implementation pattern

```typescript
import { pipeline } from '@huggingface/transformers';

const isTTY = Boolean(process.stderr.isTTY);

function onProgress(info: ProgressInfo): void {
  if (!isTTY) return; // silent in non-interactive environments

  if (info.status === 'initiate') {
    process.stderr.write(`\n[neuron] Downloading embedding model (first run only)...\n`);
  } else if (info.status === 'progress' && info.progress !== undefined) {
    const pct = info.progress.toFixed(0).padStart(3);
    process.stderr.write(`\r[neuron] ${info.file}: ${pct}%`);
  } else if (info.status === 'done') {
    process.stderr.write(`\r[neuron] ${info.file}: done         \n`);
  } else if (info.status === 'ready') {
    process.stderr.write(`[neuron] Model ready.\n`);
  }
}

const embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
  dtype: 'q8',
  progress_callback: onProgress,
});
```

**TTY detection:** `process.stderr.isTTY` is `true` only when stderr is connected to an interactive terminal. It is `undefined` or `false` when piped. Source: [Node.js `process.stderr` docs](https://nodejs.org/api/process.html#processstderr).

**Non-TTY behavior:** Silent by default. Opt-in structured logging via `NEURON_LOG_LEVEL=info` env var (emits `{"status":"downloading_model"}` to stderr) can be added for harnesses that want structured progress.

---

## 5. Cold-Start Latency per Invocation

### The problem

Each `npx neuron` spawns a fresh Node.js process. Loading the ONNX model from disk takes approximately **500 ms – 2 s** (ONNX Runtime initialization + model graph parse + memory allocation).

Breakdown (approximate, Apple M-series, warm filesystem cache):
- Node.js startup + module loading: ~100–200 ms
- `env.cacheDir` lookup + file stat: ~5 ms
- ONNX Runtime initialization: ~200–400 ms
- Model graph load (`model_quantized.onnx`, 34 MB): ~300–800 ms
- **Total:** ~600 ms – 1.4 s

### Daemon option (deferred to v2)

A persistent daemon over a Unix domain socket (à la PM2) would amortize model load across invocations. **Not recommended for v1** — the complexity of version handshake, stale socket detection, idle timeout, and `npx` path resolution is disproportionate to the latency benefit.

**Design for it:** Isolate model initialization in a single `initEmbedder()` module so a daemon wrapper can be added in v2 without refactoring business logic.

---

## Recommendation

| Decision | Choice |
|---|---|
| OS path resolution | `env-paths` with `{ suffix: '' }` |
| Model + DB root | `paths.data` (not `paths.cache` — model files are durable) |
| Model directory | `path.join(paths.data, 'models')` → set as `env.cacheDir` |
| DB directory | `path.join(paths.data, 'db')` |
| DB filename | `sha256(abs project root).slice(0,16) + '.sqlite'` |
| Offline enforcement | `env.allowRemoteModels = false` when ONNX file detected on disk |
| Download progress | `progress_callback` → stderr, gated on `process.stderr.isTTY` |
| Cold-start daemon | No in v1; isolate `initEmbedder()` for v2 daemon upgrade path |

---

## Sources

- [env-paths README (sindresorhus/env-paths)](https://github.com/sindresorhus/env-paths#readme)
- [XDG Base Directory Specification (freedesktop.org)](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- [Apple Developer — File System Programming Guide](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html)
- [Microsoft Learn — KNOWNFOLDERID (LOCALAPPDATA)](https://learn.microsoft.com/en-us/windows/win32/shell/knownfolderid)
- [Transformers.js v3 — env API reference](https://huggingface.co/docs/transformers.js/en/api/env)
- [Transformers.js v3 — Node.js usage guide](https://huggingface.co/docs/transformers.js/en/guides/node-js-usage)
- [Transformers.js source — src/env.js](https://github.com/huggingface/transformers.js/blob/main/src/env.js)
- [Transformers.js pipeline API (progress_callback)](https://huggingface.co/docs/transformers.js/en/api/pipelines#module_pipelines.pipeline)
- [Node.js process.stderr.isTTY docs](https://nodejs.org/api/process.html#processstderr)
- [PM2 daemon architecture](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/)
- [Node.js crypto.createHash docs](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options)
