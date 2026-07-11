# 🧠 @kovartravis/neuron

A local-only, zero-config semantic memory store for AI coding agents. It helps agents persist learnings (rules/conventions) and task history across sessions without external API calls or database configuration.

[![npm version](https://img.shields.io/npm/v/@kovartravis/neuron.svg)](https://www.npmjs.com/package/@kovartravis/neuron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why Neuron?

Autonomous coding agents (like Gemini, Claude, or custom harnesses) often forget project-specific instructions, conventions, or tricks learned in previous runs.

`neuron` solves this by giving agents a local memory sandbox:
- **Local-Only**: Embeddings and storage run 100% on your machine.
- **Zero-Config**: Uses SQLite and local ONNX embeddings (`Xenova/bge-small-en-v1.5`) via Transformers.js. No API keys required.
- **Project-Scoped**: Automatically partitions memories per project by hashing the project's root path.
- **Watermark Consolidation**: A stable cursor-based query engine lets harnesses periodically sweep history logs and consolidate them into rules.

---

## Installation

Run it directly from anywhere using `npx`:
```bash
npx @kovartravis/neuron status
```

Or install it globally:
```bash
npm install -g @kovartravis/neuron
```

---

## Quick Start (Example: The `beads` Project)

Imagine you are working in a repository called **`beads`** (a project for designing decorative bead strings). Here is how you use `neuron` to manage agent memory:

### 1. Initialize the project
At the root of the `beads` directory, run:
```bash
neuron init
```
This automatically creates (or updates) an `AGENTS.md` file in the root directory. This file instructs any incoming coding agent to load and save memories at the start and end of their runs.

### 2. Beginning of a Run (Context Loading)
When an agent starts a task in `beads` (e.g., "Implement a validation check for bead diameters"), it queries the memory store for any rules or solutions from past sessions:

```bash
neuron learn query "bead diameter validation"
```

**Output (JSON):**
```json
{
  "results": [
    {
      "id": "c7f541e4-8dbe-4dbe-b3bf-f6c059e92446",
      "content": "Always validate bead diameters are between 2mm and 20mm before appending to a string",
      "score": 0.894,
      "tags": ["beads", "validation"],
      "createdAt": "2026-07-11T12:00:00.000Z"
    }
  ],
  "project": "beads",
  "query": "bead diameter validation"
}
```

The agent reads this and applies the rule directly to its code implementation.

### 3. Save a Durable Learning
If the agent discovers a new project constraint (e.g., "Glass beads require double-threading"), it saves it:

```bash
neuron learn add "Glass beads require double-threading to prevent wire wear" --tags beads,threading
```

### 4. End of a Run (Logging History)
After completing a task, the agent logs its actions to the task history log:

```bash
neuron history add "Added diameter validation to BeadString.ts and wrote Vitest tests" --task-id task-42 --tags beads,validation
```

---

## Memory Consolidation

Over multiple runs, raw history logs build up. To clean them up and distill them into permanent rules:

1. **Pull unconsolidated history**:
   ```bash
   neuron history consolidate
   ```
   This returns only the history logs since the last time you consolidated, then advances the cursor.
   
2. **Distill**:
   Your agent harness feeds these logs to an LLM, extracts recurring patterns, and writes them back as durable learnings via `neuron learn add`.

---

## Command Reference

### `neuron status`
Prints metadata about the current project root, database status, and cached embedding models.

---

### `neuron learn` (Durable Rules)
| Command | Flags | Description |
|---|---|---|
| `neuron learn add "<content>"` | `--tags <tag,...>` | Store a new learning/rule |
| `neuron learn query "<text>"` | `--limit <n>` (default 5) | Semantic search learnings |
| `neuron learn list` | `--limit <n>` (default 20) | List all learnings |
| `neuron learn delete <id>` | | Delete a learning by ID |

---

### `neuron history` (Action Logs)
| Command | Flags | Description |
|---|---|---|
| `neuron history add "<summary>"` | `--task-id <id>`, `--tags <tag,...>` | Log an agent action |
| `neuron history query "<text>"` | `--limit <n>` (default 5) | Semantic search history |
| `neuron history list` | `--limit <n>` (default 20) | List recent history logs |
| `neuron history delete <id>` | | Delete a history log |
| `neuron history consolidate` | | Get unread logs & advance cursor |

---

## Technical Details

- **Database**: SQLite database stored at `~/.local/share/neuron/db/<project-hash>.sqlite` (resolves to OS-correct directory using `env-paths`). One isolated file per project.
- **Embeddings**: `Xenova/bge-small-en-v1.5` (quantized Q8, ~34 MB). Cached locally in `~/.local/share/neuron/models/`. Downloads automatically on the first run.
- **Performance**: Vectors are 384-dimensional unit-normalised floats. Cosine similarity queries are performed using optimized JS dot-products (< 1 ms search latency for under 10,000 rows).

---

## License

MIT © [Travis Kovar](https://github.com/kovartravis)
