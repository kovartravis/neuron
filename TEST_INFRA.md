# E2E Test Infra: md-file-management

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on internal implementation details.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | R1: MdStorageAdapter | ORIGINAL_REQUEST & Issue 02 | 5 | 5 | ✓ | ✓ |
| 2 | R2: DualStorageRouter | ORIGINAL_REQUEST & Issue 03 | 5 | 5 | ✓ | ✓ |
| 3 | R3: mdVectorSync Engine | ORIGINAL_REQUEST & Issue 04 | 5 | 5 | ✓ | ✓ |
| 4 | R4: CLI neuron sync & Init Scaffolding | ORIGINAL_REQUEST & Issue 05 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: Vitest (`npm test` -> `npm run build && vitest run`)
- Environment setup: `NEURON_DB_PATH` pointing to isolated temp SQLite database, `NEURON_MOCK_EMBEDDER='true'` for rapid mock embeddings.
- Directory layout:
  - Unit & Boundary Tests (Tiers 1 & 2):
    - `src/storage/mdStorageAdapter.test.ts`
    - `src/storage/dualStorageRouter.test.ts`
    - `src/storage/mdVectorSync.test.ts`
    - `src/commands/sync.test.ts`
  - Integration Tests (Tier 3):
    - `src/storage/mdFileManagement.integration.test.ts`
  - Real-World Application Scenarios (Tier 4):
    - `src/e2e/mdFileManagement.e2e.test.ts`

## Coverage Summary & Test Matrix
- Tier 1 (Feature Coverage): 20 test cases (>=5 per feature)
- Tier 2 (Boundary & Corner Cases): 20 test cases (>=5 per feature)
- Tier 3 (Cross-Feature Pairwise): 8 test cases
- Tier 4 (Real-World Application Scenarios): 5 test cases
- Total Test Cases: 53 test cases

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Description |
|---|----------|--------------------|-------------|
| 1 | T4-01 | R1, R2, R3, R4 | Developer Git Collaboration Workflow (commit md files, pull & sync) |
| 2 | T4-02 | R1, R3, R4 | Offline Knowledge Base Editing & Resynchronization |
| 3 | T4-03 | R2, R3, R4 | Storage Backend Migration (vector -> md mode backfill) |
| 4 | T4-04 | R1, R2, R3 | Interrupted Operation & Power Failure Recovery |
| 5 | T4-05 | R1, R2, R3, R4 | Fresh Repository Onboarding (init -> dual write -> sync -> search) |
