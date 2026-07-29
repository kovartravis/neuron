# Original User Request

## 2026-07-28T23:20:53-05:00

Implement all remaining tracer-bullet tickets in the md-file-management feature module to enable full Markdown file storage, dual routing, and vector synchronization for Neuron.

Working directory: /Users/Travis/Repos/neuron
Integrity mode: development

## Requirements

### R1. Markdown File Storage Adapter (MdStorageAdapter)
Implement category-based Markdown file reading, writing, YAML frontmatter formatting, parsing, and atomic swap writes (.tmp + fs.renameSync) in src/storage/mdStorageAdapter.ts.

### R2. Dual Storage Router (DualStorageRouter)
Implement mutation routing across vector-only, md-only, dual, and split storage modes in src/storage/dualStorageRouter.ts.

### R3. Markdown Vector Sync Engine (md-sync)
Implement bidirectional content-hash synchronization between Git-tracked .neuron/*.md files and local SQLite vector embeddings in src/storage/mdVectorSync.ts.

### R4. CLI neuron sync Command & Scaffolding
Implement the neuron sync CLI command and directory auto-scaffolding logic during neuron init.

## Acceptance Criteria

### Unit & Integration Verification
- All 4 feature tickets (02, 03, 04, 05) marked resolved in .scratch/md-file-management/issues/.
- Full Vitest suite (npm test) passes with 100% clean exit code across all unit & integration test files.
- neuron sync CLI command runs cleanly and resynchronizes vector database with .neuron/*.md files.
