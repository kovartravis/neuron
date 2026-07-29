# Survey & Test Infrastructure Report for `md-file-management`

## 1. Observation

- **Repository Root**: `/Users/Travis/Repos/neuron`
- **Package Configuration** (`package.json`):
  - Name: `@kovartravis/neuron`, Version: `2.0.0-rc2`
  - ESM module (`"type": "module"`)
  - Entry points: `"main": "./dist/index.js"`, `"bin": { "neuron": "dist/cli.js" }`
  - Scripts:
    ```json
    "test": "npm run build && vitest run",
    "test:watch": "vitest",
    "build": "node ./node_modules/typescript/bin/tsc",
    "prepublishOnly": "npm run build && chmod +x dist/cli.js",
    "start": "node ./dist/cli.js",
    "bench": "node benchmarks/runner.js --sanity"
    ```
- **TypeScript Configuration** (`tsconfig.json`):
  - Target: `ES2022`, Module / ModuleResolution: `NodeNext`
  - `outDir`: `./dist`, `rootDir`: `./src`, `include`: `["src/**/*"]`
- **Test Framework**: Vitest v2.1.9
- **Test Command Output (`neuron exec -- npm test`)**:
  - Test files: 13 passed (13 total)
  - Individual tests: 63 passed (63 total)
  - Duration: ~2.20 seconds
  - Passing test suites observed:
    - `src/config/neuronYaml.test.ts` (6 tests)
    - `src/commands/ui.test.ts` (7 tests)
    - `src/index.test.ts` (20 tests)
    - `src/db.test.ts` (2 tests)
    - `src/commands/init.test.ts` (5 tests)
    - `src/commands/status.test.ts` (1 test)
    - `src/commands/memory.test.ts` (2 tests)
    - `src/components/embedder.test.ts` (3 tests)
    - `src/components/fts-query.test.ts` (3 tests)
    - `src/commands/exec.test.ts` (2 tests)
    - `src/commands/history.test.ts` (4 tests)
    - `src/commands/learn.test.ts` (4 tests)
    - `src/cli.test.ts` (4 tests)
- **Existing Test Conventions**:
  - Unit/integration test files are co-located with source files in `src/` using `.test.ts` suffix.
  - Temporary databases and test files are cleaned up in `beforeAll`/`afterAll` hooks and isolated in `src/__tests__/temp-<suite>/`.
  - Environmental overrides used: `NEURON_DB_PATH` and `NEURON_MOCK_EMBEDDER: 'true'`.
- **Existing `neuron.yaml` Implementation**:
  - Config schema parser already exists in `src/config/neuronYaml.ts` and `src/config/neuronYaml.test.ts`.

---

## 2. Logic Chain

1. **Observation**: `package.json` defines `"test": "npm run build && vitest run"`.
   **Reasoning**: Vitest is configured to run after TypeScript build (`tsc`). Any newly added `.test.ts` file in `src/` will automatically be picked up by `vitest run` without extra runner configuration.
2. **Observation**: `tsconfig.json` specifies `"include": ["src/**/*"]` and `"rootDir": "./src"`.
   **Reasoning**: All TypeScript files, including unit, integration, and E2E tests, must reside inside `src/` (e.g. `src/storage/`, `src/commands/`, `src/__tests__/`) so that TypeScript compiler resolves imports and builds type definitions cleanly.
3. **Observation**: Existing unit and CLI tests in `src/commands/init.test.ts` isolate state using `NEURON_DB_PATH` and `NEURON_MOCK_EMBEDDER='true'` with child process execution of `dist/cli.js`.
   **Reasoning**: `md-file-management` tests (including `mdStorageAdapter`, `dualStorageRouter`, `mdVectorSync`, and CLI `neuron sync`) should follow this exact pattern to avoid test pollution and transformer download latency.

---

## 3. Caveats

- **No Root Vitest Config File**: Vitest currently runs with default discovery options (`**/*.{test,spec}.ts`). If custom environment variables or global setup hooks are needed in the future, a `vitest.config.ts` can be added, but current defaults are sufficient.
- **ONNX Embedder**: Embedder model loading takes time unless `NEURON_MOCK_EMBEDDER: 'true'` is supplied in test environment options.

---

## 4. Conclusion

### Summary of Repository Test Infrastructure
- Framework: Vitest (`^2.0.0`)
- Execution command: `neuron exec -- npm test` (runs `npm run build && vitest run`)
- Target compilation: `tsc` outputs to `dist/`

### Recommended Structure for `md-file-management`
```
src/
├── storage/
│   ├── mdStorageAdapter.ts
│   ├── mdStorageAdapter.test.ts       # R1: MdStorageAdapter unit tests
│   ├── dualStorageRouter.ts
│   ├── dualStorageRouter.test.ts      # R2: DualStorageRouter unit tests
│   ├── mdVectorSync.ts
│   ├── mdVectorSync.test.ts           # R3: MdVectorSync unit & sync tests
│   └── index.ts
├── commands/
│   ├── sync.ts
│   └── sync.test.ts                   # R4: neuron sync CLI subcommand tests
└── __tests__/
    └── e2e/
        └── mdFileManagement.e2e.test.ts  # End-to-end integration test suite
```

### Recommended E2E Test Execution Strategy
- E2E tests should be placed in `src/__tests__/e2e/mdFileManagement.e2e.test.ts`.
- The test harness should create a temporary project directory containing a `neuron.yaml` file with `storage.mode: "dual"` or `"split"` and test `.neuron/*.md` files.
- Command-line invocations should execute `node dist/cli.js sync` with `NEURON_DB_PATH` pointing to an isolated temp SQLite file and `NEURON_MOCK_EMBEDDER: 'true'`.
- Verify both file system contents (`.neuron/*.md` entries) and SQLite database state after sync operations.

---

## 5. Verification Method

1. **Build and Run Test Suite**:
   ```bash
   neuron exec -- npm test
   ```
2. **Verify Test File Discovery**:
   - Check that Vitest executes all 13 existing test suites plus any newly added `.test.ts` files under `src/storage/`, `src/commands/`, or `src/__tests__/e2e/`.
3. **Invalidation Conditions**:
   - `npm test` fails with non-zero exit code.
   - Test suites depend on live HuggingFace model downloads because `NEURON_MOCK_EMBEDDER` was omitted.
   - Files created outside of `src/` break `tsc` compilation.
