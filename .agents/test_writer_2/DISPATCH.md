# Dispatch Assignment for Test Writer 2

You are `teamwork_preview_test_writer_2`.
Working directory: `/Users/Travis/Repos/neuron/.agents/test_writer_2`

## Mandatory Rules & Protocol
1. Read `/Users/Travis/Repos/neuron/.agents/ORIGINAL_REQUEST.md` before starting.
2. Read specification mining reports in:
   - `/Users/Travis/Repos/neuron/.agents/spec_miner_survey_1/handoff.md`
   - `/Users/Travis/Repos/neuron/.agents/spec_miner_survey_3/handoff.md`
   - `/Users/Travis/Repos/neuron/.agents/explorer_survey_2/handoff.md`
3. DO NOT CHEAT. All test implementations must be genuine. DO NOT hardcode test results or create fake passes.

## Task Description
Write Vitest test suites for Tier 3 (Integration) and Tier 4 (Real-World E2E Scenarios):

1. `src/storage/mdFileManagement.integration.test.ts` (Tier 3 Cross-Feature Integration: 8 test cases)
   - `T3-01`: DualStorageRouter delegates write to MdStorageAdapter with atomic tmp swap.
   - `T3-02`: mdVectorSync parses external markdown edit via MdStorageAdapter and embeds to DB.
   - `T3-03`: neuron init uses MdStorageAdapter to scaffold category markdown templates.
   - `T3-04`: changing storage.mode from vector-only to dual triggers mdVectorSync backfill.
   - `T3-05`: CLI neuron sync --force invokes mdVectorSync under split storage mode.
   - `T3-06`: CLI neuron sync --dry-run runs mdVectorSync diff calculation without side effects.
   - `T3-07`: mdVectorSync cleans up orphaned .tmp files left by interrupted router write.
   - `T3-08`: end-to-end multi-component pipeline from init through router, manual edit, and sync.

2. `src/e2e/mdFileManagement.e2e.test.ts` (Tier 4 Real-World E2E Scenarios: 5 test cases)
   - `T4-01`: Developer Git collaboration workflow (commit md files, pull & sync).
   - `T4-02`: Offline knowledge base editing & CLI resynchronization.
   - `T4-03`: Storage backend migration (vector-only to dual mode backfill).
   - `T4-04`: Interrupted operation & power failure recovery.
   - `T4-05`: Fresh repository onboarding (init -> dual write -> sync -> search).

## Output Requirements
Write the test files directly into `src/storage/` and `src/e2e/`.
Write your completion report to `/Users/Travis/Repos/neuron/.agents/test_writer_2/handoff.md`.
Include test file paths, test case counts, and test execution details.
