# Dispatch Assignment for Test Writer 1

You are `teamwork_preview_test_writer_1`.
Working directory: `/Users/Travis/Repos/neuron/.agents/test_writer_1`

## Mandatory Rules & Protocol
1. Read `/Users/Travis/Repos/neuron/.agents/ORIGINAL_REQUEST.md` before starting.
2. Read specification mining reports in:
   - `/Users/Travis/Repos/neuron/.agents/spec_miner_survey_1/handoff.md`
   - `/Users/Travis/Repos/neuron/.agents/spec_miner_survey_3/handoff.md`
   - `/Users/Travis/Repos/neuron/.agents/explorer_survey_2/handoff.md`
3. DO NOT CHEAT. All test implementations must be genuine. DO NOT hardcode test results or create fake passes.

## Task Description
Write comprehensive Vitest test suites (Tiers 1 & 2) for R1, R2, R3, and R4 in TypeScript:

1. `src/storage/mdStorageAdapter.test.ts` (R1 Coverage & Boundary: 10 test cases)
   - `R1-T1-01` to `R1-T1-05`: readCategory, formatMarkdown/parseMarkdown, appendEntry, updateEntry, deleteEntry.
   - `R1-T2-01` to `R1-T2-05`: empty/zero-byte files, malformed YAML frontmatter, atomic swap (.tmp + fs.renameSync), markdown escaping, auto-scaffolding missing dir.

2. `src/storage/dualStorageRouter.test.ts` (R2 Coverage & Boundary: 10 test cases)
   - `R2-T1-01` to `R2-T1-05`: vector-only mode, md-only mode, dual mode add/update/delete, split mode routing.
   - `R2-T2-01` to `R2-T2-05`: disk write error fallback, invalid storage mode fallback, concurrent mutations, search fallback, non-existent entry ID.

3. `src/storage/mdVectorSync.test.ts` (R3 Coverage & Boundary: 10 test cases)
   - `R3-T1-01` to `R3-T1-05`: md-to-vector sync, vector-to-md backfill, SHA-256 content hash skip, syncAll, timestamp conflict resolution.
   - `R3-T2-01` to `R3-T2-05`: metadata update without vector re-embed, deleted file re-creation, batch sync (1000+ entries), duplicate IDs, DB lock handling.

4. `src/commands/sync.test.ts` (R4 Coverage & Boundary: 10 test cases)
   - `R4-T1-01` to `R4-T1-05`: neuron sync execution, --dry-run flag, --force flag, neuron init scaffolding, --category flag.
   - `R4-T2-01` to `R4-T2-05`: missing neuron.yaml fallback, --dry-run --force combined, pre-existing user file preservation during init, non-TTY pipe progress output, invalid CLI args.

## Output Requirements
Write the test files directly into `src/storage/` and `src/commands/`.
Write your completion report to `/Users/Travis/Repos/neuron/.agents/test_writer_1/handoff.md`.
Include test file paths, test case counts, and test execution details.
