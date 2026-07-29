# Handoff Report: CLI `neuron sync` Command & Scaffolding Specification (Ticket 05)

## 1. Observation

### Codebase Inspection Findings
- **CLI Entry Point (`src/cli.ts`)**:
  - `src/cli.ts` currently handles subcommands `init`, `exec`, `ui`, `status`, `memory`, `learn`, `history` via dispatch checks on `mainCommand = args[0]` (lines 25-58).
  - SQLite handles are explicitly opened via `NeuronMemory.open(process.cwd())` and closed in `finally` blocks (lines 41, 66) to prevent handle leaks.
- **Argument Parsing (`src/commands/utils.ts`)**:
  - `parseFlags()` handles string options (`--tags`, `--task-id`, `--limit`, `--file`/`-f`, `--importance`, `--scope`, `--scopes`, `--days`, `--category`, `--categories`).
  - Currently, `parseFlags()` does not parse boolean flags (`--dry-run`, `--force`, `--json`).
  - Help screens are defined in exported strings: `MASTER_HELP`, `MEMORY_HELP`, `LEARN_HELP`, `HISTORY_HELP`.
- **Existing `init` Command (`src/commands/init.ts`)**:
  - Currently copies the `neuron-memory` skill folder into detected agent harness locations (`.claude`, `.cursor`, `.agents/skills`).
  - Does NOT yet scaffold the `.neuron/` storage directory or default category Markdown files (`learning.md`, `history.md`).
- **Configuration Loader (`src/config/neuronYaml.ts`)**:
  - Defines `StorageConfigSchema` (default `mode: "vector-only"`, `path: ".neuron"`).
  - Default categories are `learning` and `history`.
  - `loadNeuronYaml()` returns parsed or fallback configuration.

---

## 2. Logic Chain

1. **Ticket 05 Goal**: Implement `neuron sync` CLI subcommand with `--dry-run` and `--force` flags, directory auto-scaffolding, visual progress output, and integration with `MdVectorSync` (Ticket 04) and `MdStorageAdapter` (Ticket 02).
2. **Flag Extensions in `parseFlags()`**:
   - `neuron sync` requires flag support for `--dry-run` (simulate sync without writes) and `--force` (ignore content hashes and re-embed all entries).
   - Adding `dryRun?: boolean`, `force?: boolean`, and `json?: boolean` to `parseFlags()` options allows all commands to seamlessly parse boolean flags.
3. **Scaffolding Integration**:
   - Both `neuron init` and `neuron sync` must ensure that `storage.path` (default `.neuron/`) exists along with category Markdown files (`learning.md`, `history.md`, and custom categories configured in `neuron.yaml`).
   - Scaffolding should be delegated to `MdStorageAdapter.ensureScaffolded()`, making the file creation idempotent and thread-safe.
4. **Execution Flow of `neuron sync`**:
   - Parse CLI arguments via `parseFlags(args.slice(1))`.
   - Load project configuration via `loadConfig(process.cwd())`.
   - Invoke `adapter.ensureScaffolded()` to auto-scaffold missing `.neuron/*.md` files.
   - Open `NeuronMemory` database and instantiate `MdVectorSync`.
   - Run `syncEngine.sync({ dryRun, force, categories })`.
   - Log visual/human-readable progress report (or JSON if `--json` flag is set).
   - Safely close database connection in `finally` block to avoid resource leaks.
5. **Vitest Strategy**:
   - Unit test suite in `src/commands/sync.test.ts` using in-memory / temporary SQLite databases and mock project directories.
   - End-to-end integration tests using `execSync('node dist/cli.js sync ...')` verifying `--dry-run`, `--force`, auto-scaffolding, and idempotency across repeated CLI invocations.

---

## 3. Caveats

- **Sync Engine Dependency**: `neuron sync` relies on `MdVectorSync` (Ticket 04) and `MdStorageAdapter` (Ticket 02). If these modules are not yet implemented when `src/commands/sync.ts` is created, stub interfaces matching the ticket specifications must be referenced.
- **Flag Collision**: `-f` is currently used as an alias for `--file` in `parseFlags()`. To avoid ambiguous flag parsing, `--force` should be explicitly checked as `--force` rather than overloading `-f`.
- **Database Resource Management**: Per memory store learnings (entry `374f7bec-ec25-4238-9c58-8b5e5236ab99`), SQLite connections MUST be explicitly closed (`memory.close()`) in `finally` blocks when executing subcommands.

---

## 4. Conclusion & Technical Specification

### Architectural Components to Implement/Update

#### A. Argument Parser Updates (`src/commands/utils.ts`)
Update `parseFlags` options interface and parser loop:
```ts
export function parseFlags(args: string[]): {
  positionals: string[];
  options: {
    tags?: string[];
    taskId?: string;
    limit?: number;
    file?: string;
    importance?: number;
    scope?: string;
    scopes?: string[];
    days?: number;
    category?: string;
    categories?: string[];
    dryRun?: boolean;
    force?: boolean;
    json?: boolean;
  };
}
```
Add flag evaluation logic:
```ts
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--json') {
      json = true;
    }
```
Export `SYNC_HELP` and add `sync` subcommand to `MASTER_HELP`:
```ts
export const SYNC_HELP = `Usage: neuron sync [flags]

Flags:
  --dry-run              Simulate synchronization without writing changes to disk or database
  --force                Force re-embedding of all Markdown entries regardless of content hash
  --category <name>      Sync only specified category
  --categories <a,b>     Sync only listed categories
  --json                 Output result in JSON format
  -h, --help             Show help for sync command`;
```

#### B. Command Handler (`src/commands/sync.ts`)
Create `src/commands/sync.ts`:
```ts
import path from 'node:path';
import { parseFlags, SYNC_HELP } from './utils.js';
import { loadConfig } from '../config/neuronYaml.js';
import { NeuronMemory } from '../index.js';
import { MdVectorSync } from '../storage/mdVectorSync.js';
import { MdStorageAdapter } from '../storage/mdStorageAdapter.js';

export async function handleSyncCommand(args: string[]): Promise<void> {
  const { options } = parseFlags(args.slice(1));

  if (args.includes('--help') || args.includes('-h')) {
    console.log(SYNC_HELP);
    process.exit(0);
  }

  const projectDir = process.cwd();
  const config = loadConfig(projectDir);
  const startTime = Date.now();

  const storagePath = path.resolve(projectDir, config.storage.path);
  const categories = options.categories ?? (options.category ? [options.category] : Object.keys(config.categories));

  // Step 1: Scaffold storage directory & category files if missing
  const adapter = new MdStorageAdapter({ storagePath, categories: Object.keys(config.categories) });
  const scaffolded = adapter.ensureScaffolded();

  // Step 2: Open memory store & execute reconciliation engine
  const memory = NeuronMemory.open(projectDir);
  const syncEngine = new MdVectorSync(memory, adapter, config);

  try {
    const report = await syncEngine.sync({
      dryRun: options.dryRun ?? false,
      force: options.force ?? false,
      categories
    });

    const durationMs = Date.now() - startTime;

    if (options.json) {
      console.log(JSON.stringify({
        status: 'synced',
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        storagePath: config.storage.path,
        scaffolded,
        report,
        durationMs
      }));
    } else {
      console.log(`[neuron sync] Storage Mode: ${config.storage.mode} (${config.storage.path})`);
      if (scaffolded.length > 0) {
        console.log(`[neuron sync] Scaffolded missing files: ${scaffolded.join(', ')}`);
      }
      console.log(`[neuron sync] Markdown -> Vector reconciliation:`);
      console.log(`  - Scanned: ${report.markdownToVector.scanned} entries`);
      console.log(`  - Added:   ${report.markdownToVector.added}`);
      console.log(`  - Updated: ${report.markdownToVector.updated}`);
      console.log(`  - Deleted: ${report.markdownToVector.deleted}`);
      console.log(`[neuron sync] Vector -> Markdown reconciliation:`);
      console.log(`  - Scanned: ${report.vectorToMarkdown.scanned} entries`);
      console.log(`  - Written: ${report.vectorToMarkdown.written}`);
      if (options.dryRun) {
        console.log(`[neuron sync] DRY RUN complete — no changes written (${durationMs}ms)`);
      } else {
        console.log(`[neuron sync] Resynchronization complete (${durationMs}ms)`);
      }
    }
  } finally {
    memory.close();
  }
}
```

#### C. CLI Main Router (`src/cli.ts`)
Add `handleSyncCommand` import and route:
```ts
import {
  findProjectRoot,
  handleInitCommand,
  handleSyncCommand,
  // ...
} from './commands/index.js';

// Inside main():
if (mainCommand === 'sync') {
  return await handleSyncCommand(args);
}
```

#### D. Scaffolding in `neuron init` (`src/commands/init.ts`)
Update `handleInitCommand`:
```ts
export function handleInitCommand(args: string[]): void {
  const { options } = parseFlags(args.slice(1));
  const projectDir = process.cwd();

  // 1. Detect harnesses and copy neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  // 2. Scaffold .neuron/ directory & category markdown files
  const config = loadConfig(projectDir);
  const storagePath = path.resolve(projectDir, config.storage.path);
  const adapter = new MdStorageAdapter({ storagePath, categories: Object.keys(config.categories) });
  const scaffoldedFiles = adapter.ensureScaffolded();

  console.log(JSON.stringify({
    status: 'initialized',
    projectRoot: projectDir,
    skillsWritten,
    scaffoldedFiles
  }));
}
```

#### E. Command Export Index (`src/commands/index.ts`)
Add export statement:
```ts
export * from './sync.js';
```

---

## 5. Verification Method

To verify ticket 05 implementation:

1. **Build the CLI**:
   ```bash
   neuron exec -- npm run build
   ```
2. **Run Unit & E2E Vitest Test Suite**:
   ```bash
   neuron exec -- npx vitest run src/commands/sync.test.ts src/commands/init.test.ts src/cli.test.ts
   ```
3. **Manual CLI Functional Verification**:
   ```bash
   # Test init scaffolding
   mkdir /tmp/test-neuron-sync && cd /tmp/test-neuron-sync
   node /Users/Travis/Repos/neuron/dist/cli.js init
   # Verify .neuron/ directory, learning.md, history.md exist

   # Test dry run
   node /Users/Travis/Repos/neuron/dist/cli.js sync --dry-run

   # Test forced sync
   node /Users/Travis/Repos/neuron/dist/cli.js sync --force
   ```
4. **Invalidation Conditions**:
   - CLI fails to exit with code 0.
   - `neuron sync` fails to close SQLite handle.
   - Running `neuron sync --dry-run` alters files in `.neuron/` or writes to SQLite DB.
   - `neuron init` does not create `.neuron/learning.md` and `.neuron/history.md`.
