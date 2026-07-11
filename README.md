# neuron

**Local semantic memory store for AI coding agents, powered by local vector embeddings and SQLite.**

**Platforms:** macOS, Linux, Windows

[![npm version](https://img.shields.io/npm/v/@kovartravis/neuron.svg)](https://www.npmjs.com/package/@kovartravis/neuron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Neuron provides a persistent, structured memory for coding agents. It helps agents retain project-specific instructions, conventions, and task history across sessions without external API calls or database configurations.

---

## ⚡ Quick Start

```bash
# Install neuron CLI globally
npm install -g @kovartravis/neuron

# Initialize in YOUR project (creates AGENTS.md)
cd your-project
neuron init

# Check the status of your local database and cache
neuron status
```

`neuron init` creates or updates `AGENTS.md` by default so agents can discover the neuron workflow.

If your agent is not covered by automatic discovery, add this minimal `AGENTS.md` section:

```markdown
This project uses @kovartravis/neuron for persisting learnings and task history.

- Before starting a task, run `neuron learn query "<query matching current task>"` to retrieve past project conventions.
- After completing a task, log it with `neuron history add "<summary of what was built/fixed>" --tags <related-topics>`.
- Save new conventions with `neuron learn add "<new rule/learning established>" --tags <topic>`.
```

---

## 🛠 Features

* **SQLite-Powered:** Version-controlled SQLite database locally on disk. One isolated file per project, automatically keyed by hashing the project's root path.
* **Transformers.js Local Model:** Uses `Xenova/bge-small-en-v1.5` (quantized Q8, ~34 MB) for zero-config, 100% offline embedding generation. Downloads and caches locally on first use.
* **Dot-Product Similarity:** Performs fast dot-product similarity searches in pure JS (< 1 ms search latency for under 10,000 rows).
* **Watermark Consolidation:** Stable, sequential, `rowid`-based history consolidation to safely query unread history and advance cursors.
* **CLI-Ready Output:** Structured JSON outputs designed specifically for programmatic AI parsing.

---

## 📖 Essential Commands

### Learnings Namespace (Durable Rules)
| Command | Action |
| --- | --- |
| `neuron learn add "insight"` | Store a new project learning/rule. |
| `neuron learn query "query"` | Semantically search learnings. |
| `neuron learn list` | List all learnings. |
| `neuron learn delete <id>` | Delete a learning by ID. |

### History Namespace (Action Logs)
| Command | Action |
| --- | --- |
| `neuron history add "summary"` | Log an agent action with optional `--task-id <id>` and `--tags <tag,...>`. |
| `neuron history query "query"` | Semantically search history. |
| `neuron history list` | List recent history logs. |
| `neuron history delete <id>` | Delete a history log. |
| `neuron history consolidate` | Get unread logs & advance cursor. |

---

## 🔗 Technical Architecture

* **Database Location**: Database files are stored under `~/.local/share/neuron/db/` (resolves to OS-correct directory using `env-paths`).
* **Model Cache**: Embedding models are stored under `~/.local/share/neuron/models/`. Once the ONNX binary is detected, it automatically enforces `env.allowRemoteModels = false` to run entirely offline.
* **Idempotent Scaffolding**: `neuron init` checks if the `## Memory Store` block already exists, updating it in-place to avoid duplication.
* **WAL Mode**: SQLite runs in Write-Ahead Logging (`journal_mode = WAL`) to handle concurrent database accesses and minimize contention.

---

## License

MIT © [Travis Kovar](https://github.com/kovartravis)
