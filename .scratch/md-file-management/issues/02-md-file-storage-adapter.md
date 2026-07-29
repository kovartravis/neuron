# 02 — Markdown File Storage Adapter (`MdStorageAdapter`)

**What to build:** Implement `MdStorageAdapter` to handle reading, writing, parsing, and formatting memory entries directly within category-based Markdown files (`.neuron/learning.md`, `.neuron/history.md`, `.neuron/decisions.md`).

**Blocked by:** 01 — `neuron.yaml` Configuration Schema & Parser

**Status:** resolved

- [x] Support category-based file naming inside `storage.path` (e.g. `.neuron/<category>.md`).
- [x] Implement Markdown entry formatting using section headings (`## <title>`) and YAML frontmatter metadata (`id`, `createdAt`, `importance`, `tags`, `scope`, `taskId`).
- [x] Implement Markdown parser to extract structured `Memory` objects from `.md` category files.
- [x] Implement atomic swap writes (`.tmp` file + `fs.renameSync`) to ensure zero corruption on interrupted writes.
- [x] Implement auto-scaffolding of missing `storage.path` directories.
- [x] Provide unit tests for reading, writing, appending, updating, and deleting entries in `.md` category files.
