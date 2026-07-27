# Specification: `.md` File Management & `.neuronrc` Integration

## Overview

`neuron` currently stores learnings and action history in a project-scoped SQLite database with vector embeddings. Adding `.md` file management extends `neuron` to support reading from, writing to, and synchronizing with human-readable Markdown (`.md`) files in project repositories (e.g., `AGENTS.md`, `CONTEXT.md`, `.scratch/notes.md`, or dedicated memory `.md` files).

Configuration is managed via a `.neuronrc` file at the root of the project directory.

## `.neuronrc` File Specification

The `.neuronrc` file uses JSON format. It is discovered by walking up from CWD to the project root.

### Example `.neuronrc` Configuration

```json
{
  "version": "1.0",
  "storage": {
    "mode": "dual",
    "defaultProvider": "vector"
  },
  "learn": {
    "mode": "split",
    "rules": [
      {
        "tags": ["rule", "protocol", "agents"],
        "target": "AGENTS.md",
        "section": "Agent Rules",
        "storeInVector": true
      },
      {
        "tags": ["context", "domain"],
        "target": "CONTEXT.md",
        "storeInVector": true
      }
    ],
    "defaultTarget": ".scratch/learnings.md"
  },
  "history": {
    "mode": "dual",
    "target": ".scratch/history.md",
    "maxFileEntries": 500,
    "storeInVector": true
  },
  "sync": {
    "autoSyncOnExec": true,
    "watchMarkdown": false
  }
}
```

### Storage Modes

- `vector-only`: Standard legacy behavior; all operations use SQLite + vector search.
- `md-only`: All learnings and history entries are logged to `.md` files (vector indexing disabled).
- `dual`: Operations write to both Vector DB and designated `.md` files simultaneously; queries merge results.
- `split`: Routing rules determine which entries go to Vector DB, `.md` files, or both based on tags/importance.

## Architecture Components

1. **Config Parser (`src/config/neuronrc.ts`)**: Loads, validates against Zod schema, merges defaults, and resolves relative `.md` paths.
2. **Markdown Storage Adapter (`src/storage/md-adapter.ts`)**: Encapsulates reading/writing sectioned markdown blocks, frontmatter headers, and entry formatting.
3. **Storage Router (`src/storage/router.ts`)**: Wraps both `MemoryStore` (vector SQLite) and `MdStorageAdapter`, executing dual writes and split queries.
4. **Sync Engine (`src/storage/sync.ts`)**: Parses `.md` files to extract new or modified entries and updates the SQLite vector index.
5. **CLI Subcommands**:
   - `neuron config`: Display or validate the current `.neuronrc` settings.
   - `neuron sync`: Force synchronization between `.md` files and vector DB.
